"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { syncCurriculoMd, syncOfficialCurriculumMd } from "@/lib/curriculoSync";
import {
  applyCurriculumPatch,
  runCurriculumAnalysisForUser,
  shouldTriggerAutoAnalysis,
} from "@/lib/curriculumAi";
import {
  isStaleTimeEntry,
  resolveStaleTimeEntryEndTime,
} from "@/lib/timetracking";

export async function autoCloseStaleTimeEntries(userEmail?: string) {
  const now = new Date();
  const openEntries = await prisma.timeEntry.findMany({
    where: {
      endTime: null,
      ...(userEmail
        ? {
            taskInstance: {
              scheduledTask: {
                userEmail,
              },
            },
          }
        : {}),
    },
    include: {
      checkins: {
        orderBy: { timestamp: "desc" },
      },
      taskInstance: {
        include: {
          scheduledTask: {
            select: { start: true, end: true },
          },
        },
      },
    },
  });

  const staleUpdates = openEntries
    .filter((entry) => isStaleTimeEntry(entry.startTime, now))
    .map((entry) => {
      const task = entry.taskInstance.scheduledTask;
      const scheduledDurationMs = Math.max(
        0,
        new Date(task.end).getTime() - new Date(task.start).getTime()
      );
      const resolvedEndTime = resolveStaleTimeEntryEndTime(
        entry,
        scheduledDurationMs
      );
      return prisma.timeEntry.update({
        where: { id: entry.id },
        data: { endTime: resolvedEndTime },
      });
    });

  if (staleUpdates.length > 0) {
    await prisma.$transaction(staleUpdates);
  }

  return staleUpdates.length;
}

export async function createScheduledTask(data: {
  googleTaskId: string;
  title: string;
  start: Date;
  end: Date;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    throw new Error("Unauthorized");
  }

  const existingTasks = await prisma.scheduledTask.findMany({
    where: { userEmail: session.user.email },
    select: { color: true, googleTaskId: true }
  });
  
  const { getSemanticColor, getLeastUsedColor } = await import('@/lib/colors');
  const usedColors = existingTasks.map((t: any) => t.color || getSemanticColor(t.googleTaskId));
  const newColor = getLeastUsedColor(usedColors);

  const task = await prisma.scheduledTask.create({
    data: {
      ...data,
      color: newColor,
      userEmail: session.user.email,
    }
  });

  revalidatePath("/");
  return task;
}

export async function getScheduledTasks() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    return [];
  }

  const tasks = await prisma.scheduledTask.findMany({
    where: {
      userEmail: session.user.email,
    },
    include: {
      instances: {
        include: {
          timeEntries: {
            include: {
              checkins: {
                orderBy: { timestamp: "desc" }
              }
            },
            orderBy: { startTime: "desc" }
          }
        }
      }
    }
  });

  const now = new Date();
  const staleUpdates: ReturnType<typeof prisma.timeEntry.update>[] = [];

  for (const task of tasks) {
    const scheduledDurationMs = Math.max(
      0,
      new Date(task.end).getTime() - new Date(task.start).getTime()
    );
    for (const instance of task.instances) {
      for (const entry of instance.timeEntries) {
        if (!entry.endTime && isStaleTimeEntry(entry.startTime, now)) {
          const resolvedEndTime = resolveStaleTimeEntryEndTime(
            entry,
            scheduledDurationMs
          );
          entry.endTime = resolvedEndTime;
          staleUpdates.push(
            prisma.timeEntry.update({
              where: { id: entry.id },
              data: { endTime: resolvedEndTime },
            })
          );
        }
      }
    }
  }

  if (staleUpdates.length > 0) {
    await prisma.$transaction(staleUpdates);
  }

  return tasks;
}

export async function toggleScheduledTaskCompletion(id: string, completed: boolean) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const [baseId, dateString] = id.split('-');
  const task = await prisma.scheduledTask.findUnique({ where: { id: baseId } });
  if (!task || task.userEmail !== session.user.email) throw new Error("Unauthorized");

  if (dateString) {
    const instanceDate = new Date(parseInt(dateString));
    await prisma.taskInstance.upsert({
      where: {
        scheduledTaskId_instanceDate: {
          scheduledTaskId: baseId,
          instanceDate
        }
      },
      create: {
        scheduledTaskId: baseId,
        instanceDate,
        completed,
        completedAt: completed ? new Date() : null
      },
      update: {
        completed,
        completedAt: completed ? new Date() : null
      }
    });
  } else {
    await prisma.$transaction([
      prisma.scheduledTask.update({
        where: { id: baseId },
        data: { completed }
      }),
      prisma.taskInstance.updateMany({
        where: { scheduledTaskId: baseId },
        data: { 
          completed,
          completedAt: completed ? new Date() : null
        }
      })
    ]);
  }

  await syncCurriculoMd();
  revalidatePath("/");
  return task;
}

export async function updateScheduledTaskTime(id: string, start: Date, end: Date) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    throw new Error("Unauthorized");
  }

  const baseId = id.split('-')[0];
  const task = await prisma.scheduledTask.findUnique({ where: { id: baseId } });
  if (!task || task.userEmail !== session.user.email) {
    throw new Error("Unauthorized");
  }

  const updated = await prisma.scheduledTask.update({
    where: { id: baseId },
    data: { start, end },
  });

  revalidatePath("/");
  return updated;
}

export async function updateScheduledTaskRecurrence(id: string, rrule: string | null) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const baseId = id.split('-')[0];
  const task = await prisma.scheduledTask.findUnique({ where: { id: baseId } });
  if (!task || task.userEmail !== session.user.email) throw new Error("Unauthorized");

  const updated = await prisma.scheduledTask.update({
    where: { id: baseId },
    data: { rrule },
  });

  revalidatePath("/");
  return updated;
}

export async function deleteScheduledTask(id: string) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const baseId = id.split('-')[0];
  const task = await prisma.scheduledTask.findUnique({ where: { id: baseId } });
  if (!task || task.userEmail !== session.user.email) throw new Error("Unauthorized");

  await prisma.scheduledTask.delete({
    where: { id: baseId }
  });

  await syncCurriculoMd();
  revalidatePath("/");
}

export async function updateGoogleTask(taskListId: string, taskId: string, updates: any) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.accessToken) {
    throw new Error("Unauthorized");
  }

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });

  if (!res.ok) {
    throw new Error(`Failed to update task: ${res.statusText}`);
  }

  revalidatePath("/");
  return res.json();
}

export async function startTimeTracking(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  await autoCloseStaleTimeEntries(session.user.email);

  const [baseId, dateString] = id.split('-');
  const task = await prisma.scheduledTask.findUnique({ 
    where: { id: baseId },
    include: { instances: true }
  });
  if (!task || task.userEmail !== session.user.email) throw new Error("Unauthorized");

  let instance;
  if (dateString) {
    const instanceDate = new Date(parseInt(dateString));
    instance = await prisma.taskInstance.upsert({
      where: { scheduledTaskId_instanceDate: { scheduledTaskId: baseId, instanceDate } },
      create: { scheduledTaskId: baseId, instanceDate },
      update: {}
    });
  } else {
    // Non-recurring task - grab first or create one
    if (task.instances.length > 0) {
      instance = task.instances[0];
    } else {
      instance = await prisma.taskInstance.create({
        data: { scheduledTaskId: baseId, instanceDate: task.start }
      });
    }
  }

  await prisma.timeEntry.create({
    data: {
      taskInstanceId: instance.id,
      startTime: new Date()
    }
  });
  
  await syncCurriculoMd();
  revalidatePath("/");
}

export async function stopTimeTracking(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const [baseId, dateString] = id.split('-');
  const instanceDate = dateString ? new Date(parseInt(dateString)) : undefined;

  // We need to find the instance ID first
  let taskInstanceId;
  if (instanceDate) {
    const inst = await prisma.taskInstance.findUnique({
      where: { scheduledTaskId_instanceDate: { scheduledTaskId: baseId, instanceDate } }
    });
    if (inst) taskInstanceId = inst.id;
  } else {
    const inst = await prisma.taskInstance.findFirst({
      where: { scheduledTaskId: baseId },
      orderBy: { instanceDate: 'desc' }
    });
    if (inst) taskInstanceId = inst.id;
  }

  if (taskInstanceId) {
    const activeEntry = await prisma.timeEntry.findFirst({
      where: { taskInstanceId, endTime: null },
      include: {
        checkins: { orderBy: { timestamp: 'desc' } },
        taskInstance: {
          include: {
            scheduledTask: { select: { start: true, end: true } }
          }
        }
      },
      orderBy: { startTime: 'desc' }
    });

    if (activeEntry) {
      const now = new Date();
      let endTime = now;
      if (isStaleTimeEntry(activeEntry.startTime, now)) {
        const task = activeEntry.taskInstance.scheduledTask;
        const scheduledDurationMs = Math.max(
          0,
          new Date(task.end).getTime() - new Date(task.start).getTime()
        );
        endTime = resolveStaleTimeEntryEndTime(activeEntry, scheduledDurationMs);
      }

      await prisma.timeEntry.update({
        where: { id: activeEntry.id },
        data: { endTime }
      });
      revalidatePath("/");
    }
  }
}

export async function addCheckIn(id: string, note: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const [baseId, dateString] = id.split('-');
  const instanceDate = dateString ? new Date(parseInt(dateString)) : undefined;

  let taskInstanceId;
  if (instanceDate) {
    const inst = await prisma.taskInstance.findUnique({
      where: { scheduledTaskId_instanceDate: { scheduledTaskId: baseId, instanceDate } }
    });
    if (inst) taskInstanceId = inst.id;
  } else {
    const inst = await prisma.taskInstance.findFirst({
      where: { scheduledTaskId: baseId },
      orderBy: { instanceDate: 'desc' }
    });
    if (inst) taskInstanceId = inst.id;
  }

  if (taskInstanceId) {
    const activeEntry = await prisma.timeEntry.findFirst({
      where: { taskInstanceId, endTime: null },
      orderBy: { startTime: 'desc' }
    });

    if (activeEntry) {
      await prisma.checkIn.create({
        data: {
          timeEntryId: activeEntry.id,
          note
        }
      });
      await syncCurriculoMd();
      revalidatePath("/");
    }
  }
}

export async function createGoogleTask(title: string, taskListId: string = '@default') {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.accessToken) throw new Error("Unauthorized");

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title })
  });

  if (!res.ok) {
    throw new Error(`Failed to create task: ${res.statusText}`);
  }

  revalidatePath("/");
  return res.json();
}

export async function deleteCheckIn(checkInId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const checkIn = await prisma.checkIn.findUnique({
    where: { id: checkInId },
    include: {
      timeEntry: {
        include: {
          taskInstance: {
            include: { scheduledTask: true }
          }
        }
      }
    }
  });

  if (!checkIn || checkIn.timeEntry.taskInstance.scheduledTask.userEmail !== session.user.email) {
    throw new Error("Unauthorized");
  }

  await prisma.checkIn.delete({
    where: { id: checkInId }
  });

  await syncCurriculoMd();
  revalidatePath("/");
}

export async function toggleCheckInLunchDiscount(checkInId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const checkIn = await prisma.checkIn.findUnique({
    where: { id: checkInId },
    include: {
      timeEntry: {
        include: {
          taskInstance: {
            include: { scheduledTask: true }
          }
        }
      }
    }
  });

  if (!checkIn || checkIn.timeEntry.taskInstance.scheduledTask.userEmail !== session.user.email) {
    throw new Error("Unauthorized");
  }

  const nextValue = !checkIn.hasLunchDiscount;

  if (nextValue) {
    const taskInstanceId = checkIn.timeEntry.taskInstanceId;
    const timeEntries = await prisma.timeEntry.findMany({
      where: { taskInstanceId },
      select: { id: true }
    });
    const timeEntryIds = timeEntries.map((te) => te.id);

    await prisma.checkIn.updateMany({
      where: {
        timeEntryId: { in: timeEntryIds },
        hasLunchDiscount: true
      },
      data: {
        hasLunchDiscount: false
      }
    });
  }

  await prisma.checkIn.update({
    where: { id: checkInId },
    data: { hasLunchDiscount: nextValue }
  });

  await syncCurriculoMd();
  revalidatePath("/");
}

export async function createGoogleTaskList(title: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.accessToken) throw new Error("Unauthorized");

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/users/@me/lists`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error(`Failed to create task list`);
  
  revalidatePath("/");
  return res.json();
}

export async function deleteGoogleTaskList(taskListId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.accessToken) throw new Error("Unauthorized");

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/users/@me/lists/${taskListId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.accessToken}` }
  });
  if (!res.ok) throw new Error(`Failed to delete task list`);
  
  await syncCurriculoMd();
  revalidatePath("/");
}

export async function deleteGoogleTask(taskListId: string, taskId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.accessToken) throw new Error("Unauthorized");

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.accessToken}` }
  });
  if (!res.ok) throw new Error(`Failed to delete task`);
  
  await syncCurriculoMd();
  revalidatePath("/");
}

export async function clearOldCompletedTasks(tasks: {taskListId: string, taskId: string}[]) {
  const session = await getServerSession(authOptions);
  if (!session || !session.accessToken) throw new Error("Unauthorized");

  // Fire all deletes concurrently
  const promises = tasks.map(t => 
    fetch(`https://tasks.googleapis.com/tasks/v1/lists/${t.taskListId}/tasks/${t.taskId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.accessToken}` }
    })
  );
  
  await Promise.allSettled(promises);
  await syncCurriculoMd();
  revalidatePath("/");
}

export async function cancelScheduledTaskInstance(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const [baseId, dateString] = id.split('-');
  if (!dateString) throw new Error("Not an instance");

  const task = await prisma.scheduledTask.findUnique({ where: { id: baseId } });
  if (!task || task.userEmail !== session.user.email) throw new Error("Unauthorized");

  const instanceDate = new Date(parseInt(dateString));
  await prisma.scheduledTask.update({
    where: { id: baseId },
    data: {
      exdates: {
        push: instanceDate
      }
    }
  });
  
  await prisma.taskInstance.deleteMany({
    where: { scheduledTaskId: baseId, instanceDate: instanceDate }
  });

  await syncCurriculoMd();
  revalidatePath("/");
}

export async function extractScheduledTaskInstance(id: string, newStart: Date, newEnd: Date) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const [baseId, dateString] = id.split('-');
  if (!dateString) throw new Error("Not an instance");

  const task = await prisma.scheduledTask.findUnique({ where: { id: baseId } });
  if (!task || task.userEmail !== session.user.email) throw new Error("Unauthorized");

  const instanceDate = new Date(parseInt(dateString));
  
  await prisma.scheduledTask.update({
    where: { id: baseId },
    data: {
      exdates: {
        push: instanceDate
      }
    }
  });

  const newTask = await prisma.scheduledTask.create({
    data: {
      title: task.title,
      googleTaskId: task.googleTaskId,
      userEmail: task.userEmail,
      color: task.color,
      start: newStart,
      end: newEnd,
      rrule: null,
    }
  });

  const oldInstance = await prisma.taskInstance.findUnique({
    where: { scheduledTaskId_instanceDate: { scheduledTaskId: baseId, instanceDate } }
  });
  
  if (oldInstance) {
    await prisma.taskInstance.update({
      where: { id: oldInstance.id },
      data: {
        scheduledTaskId: newTask.id,
        instanceDate: newStart,
      }
    });
  }

  await syncCurriculoMd();
  revalidatePath("/");
}

export async function getAlarms() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) return [];

  return prisma.alarm.findMany({
    where: { userEmail: session.user.email },
    orderBy: { time: "asc" }
  });
}

export async function createAlarm(data: {
  title: string;
  message?: string;
  time: string;
  color: string;
  daysOfWeek: number[];
  date?: Date;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const alarm = await prisma.alarm.create({
    data: {
      title: data.title,
      message: data.message,
      time: data.time,
      color: data.color || "#ef4444",
      daysOfWeek: data.daysOfWeek || [],
      date: data.date,
      userEmail: session.user.email,
      enabled: true,
    }
  });

  revalidatePath("/");
  return alarm;
}

export async function updateAlarm(id: string, data: Partial<{
  title: string;
  message: string;
  time: string;
  color: string;
  daysOfWeek: number[];
  date: Date | null;
  enabled: boolean;
}>) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const alarm = await prisma.alarm.findUnique({ where: { id } });
  if (!alarm || alarm.userEmail !== session.user.email) throw new Error("Unauthorized");

  const updated = await prisma.alarm.update({
    where: { id },
    data
  });

  revalidatePath("/");
  return updated;
}

export async function deleteAlarm(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const alarm = await prisma.alarm.findUnique({ where: { id } });
  if (!alarm || alarm.userEmail !== session.user.email) throw new Error("Unauthorized");

  await prisma.alarm.delete({ where: { id } });
  await syncCurriculoMd();
  revalidatePath("/");
}

export async function toggleAlarm(id: string, enabled: boolean) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const alarm = await prisma.alarm.findUnique({ where: { id } });
  if (!alarm || alarm.userEmail !== session.user.email) throw new Error("Unauthorized");

  await prisma.alarm.update({
    where: { id },
    data: { enabled }
  });

  await syncCurriculoMd();
  revalidatePath("/");
}

export async function triggerTestAlarm(testData: { title: string; message?: string; color: string }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const daemonToken = process.env.ALARM_DAEMON_TOKEN || "otto_daemon_secret_2026";

  await fetch(`${baseUrl}/api/alarms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${daemonToken}`
    },
    body: JSON.stringify({
      action: "trigger_test",
      testAlarm: testData
    })
  });
}

export async function toggleScheduledTaskCounterMode(id: string, hasCounter: boolean) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const baseId = id.split('-')[0];
  const task = await prisma.scheduledTask.findUnique({ where: { id: baseId } });
  if (!task || task.userEmail !== session.user.email) throw new Error("Unauthorized");

  const updated = await prisma.scheduledTask.update({
    where: { id: baseId },
    data: { hasCounter }
  });

  revalidatePath("/");
  return updated;
}

export async function setScheduledTaskCount(id: string, targetCount: number) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const [baseId, dateString] = id.split('-');
  const task = await prisma.scheduledTask.findUnique({
    where: { id: baseId },
    include: { instances: true }
  });
  if (!task || task.userEmail !== session.user.email) throw new Error("Unauthorized");

  const { computeNextCounterState } = await import('@/lib/recurrence');
  const { count, completed } = computeNextCounterState(0, targetCount);

  if (dateString) {
    const instanceDate = new Date(parseInt(dateString));
    await prisma.taskInstance.upsert({
      where: {
        scheduledTaskId_instanceDate: {
          scheduledTaskId: baseId,
          instanceDate
        }
      },
      create: {
        scheduledTaskId: baseId,
        instanceDate,
        count,
        completed,
        completedAt: completed ? new Date() : null
      },
      update: {
        count,
        completed,
        completedAt: completed ? new Date() : null
      }
    });
  } else {
    const latestInstance = task.instances.length > 0
      ? [...task.instances].sort((a, b) => b.instanceDate.getTime() - a.instanceDate.getTime())[0]
      : undefined;

    if (latestInstance) {
      await prisma.$transaction([
        prisma.taskInstance.update({
          where: { id: latestInstance.id },
          data: {
            count,
            completed,
            completedAt: completed ? (latestInstance.completedAt || new Date()) : null
          }
        }),
        prisma.scheduledTask.update({
          where: { id: baseId },
          data: { completed }
        })
      ]);
    } else {
      await prisma.$transaction([
        prisma.taskInstance.create({
          data: {
            scheduledTaskId: baseId,
            instanceDate: task.start,
            count,
            completed,
            completedAt: completed ? new Date() : null
          }
        }),
        prisma.scheduledTask.update({
          where: { id: baseId },
          data: { completed }
        })
      ]);
    }
  }

  await syncCurriculoMd();
  revalidatePath("/");
}

export async function adjustScheduledTaskCount(id: string, delta: number) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const [baseId, dateString] = id.split('-');
  const task = await prisma.scheduledTask.findUnique({
    where: { id: baseId },
    include: { instances: true }
  });
  if (!task || task.userEmail !== session.user.email) throw new Error("Unauthorized");

  const { computeNextCounterState } = await import('@/lib/recurrence');

  if (dateString) {
    const instanceDate = new Date(parseInt(dateString));
    const existing = await prisma.taskInstance.findUnique({
      where: {
        scheduledTaskId_instanceDate: {
          scheduledTaskId: baseId,
          instanceDate
        }
      }
    });

    const currentCount = existing?.count || 0;
    const { count, completed } = computeNextCounterState(currentCount, delta);

    await prisma.taskInstance.upsert({
      where: {
        scheduledTaskId_instanceDate: {
          scheduledTaskId: baseId,
          instanceDate
        }
      },
      create: {
        scheduledTaskId: baseId,
        instanceDate,
        count,
        completed,
        completedAt: completed ? new Date() : null
      },
      update: {
        count,
        completed,
        completedAt: completed ? (existing?.completedAt || new Date()) : null
      }
    });
  } else {
    const latestInstance = task.instances.length > 0
      ? [...task.instances].sort((a, b) => b.instanceDate.getTime() - a.instanceDate.getTime())[0]
      : undefined;

    const currentCount = latestInstance?.count || 0;
    const { count, completed } = computeNextCounterState(currentCount, delta);

    if (latestInstance) {
      await prisma.$transaction([
        prisma.taskInstance.update({
          where: { id: latestInstance.id },
          data: {
            count,
            completed,
            completedAt: completed ? (latestInstance.completedAt || new Date()) : null
          }
        }),
        prisma.scheduledTask.update({
          where: { id: baseId },
          data: { completed }
        })
      ]);
    } else {
      await prisma.$transaction([
        prisma.taskInstance.create({
          data: {
            scheduledTaskId: baseId,
            instanceDate: task.start,
            count,
            completed,
            completedAt: completed ? new Date() : null
          }
        }),
        prisma.scheduledTask.update({
          where: { id: baseId },
          data: { completed }
        })
      ]);
    }
  }

  await syncCurriculoMd();
  revalidatePath("/");
}

export async function getCurriculumData() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return {
      document: null,
      pendingCount: 0,
      unanalyzedCheckInsCount: 0,
      shouldAutoAnalyze: false,
    };
  }

  try {
    const userEmail = session.user.email;
    const document = await prisma.curriculumDocument.findUnique({
      where: { userEmail },
      include: {
        suggestions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const unanalyzedCheckIns = await prisma.checkIn.findMany({
      where: {
        ...(document?.lastAnalyzedAt
          ? { timestamp: { gt: document.lastAnalyzedAt } }
          : {}),
        timeEntry: {
          taskInstance: {
            scheduledTask: {
              userEmail,
            },
          },
        },
      },
      select: {
        id: true,
        timestamp: true,
        note: true,
      },
      orderBy: { timestamp: "asc" },
    });

    const pendingCount =
      document?.suggestions.filter((s) => s.status === "PENDING").length || 0;

    const shouldAutoAnalyze =
      Boolean(document && document.content.trim().length > 0) &&
      shouldTriggerAutoAnalysis(unanalyzedCheckIns, document?.lastAnalyzedAt);

    return {
      document,
      pendingCount,
      unanalyzedCheckInsCount: unanalyzedCheckIns.length,
      shouldAutoAnalyze,
    };
  } catch (err) {
    console.warn("getCurriculumData fallback:", (err as Error)?.message);
    return {
      document: null,
      pendingCount: 0,
      unanalyzedCheckInsCount: 0,
      shouldAutoAnalyze: false,
    };
  }
}

export async function saveCurriculumContent(content: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const userEmail = session.user.email;
  const existing = await prisma.curriculumDocument.findUnique({
    where: { userEmail },
  });

  const previousBackup =
    existing && existing.content !== content
      ? existing.content
      : existing?.previousBackup ?? null;

  const updated = await prisma.curriculumDocument.upsert({
    where: { userEmail },
    create: {
      userEmail,
      content,
    },
    update: {
      content,
      previousBackup,
    },
  });

  await syncOfficialCurriculumMd(content);
  revalidatePath("/");
  return updated;
}

export async function reviewCurriculumSuggestions(
  decisions: {
    id: string;
    action: "APPROVE" | "REJECT";
    editedText?: string;
  }[]
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  if (!decisions || decisions.length === 0) return;

  const userEmail = session.user.email;
  const doc = await prisma.curriculumDocument.findUnique({
    where: { userEmail },
    include: {
      suggestions: true,
    },
  });

  if (!doc) throw new Error("Currículo não encontrado.");

  const suggestionMap = new Map(doc.suggestions.map((s) => [s.id, s]));
  let updatedContent = doc.content;
  let hasApproved = false;

  const now = new Date();
  const txOperations: any[] = [];

  for (const decision of decisions) {
    const suggestion = suggestionMap.get(decision.id);
    if (!suggestion) continue;

    if (decision.action === "APPROVE") {
      const finalSuggestedText =
        typeof decision.editedText === "string" &&
        decision.editedText.trim().length > 0
          ? decision.editedText.trim()
          : suggestion.suggestedText;

      updatedContent = applyCurriculumPatch(updatedContent, {
        type: suggestion.type === "REWRITE" ? "REWRITE" : "ADD",
        sectionTitle: suggestion.sectionTitle,
        originalText: suggestion.originalText,
        suggestedText: finalSuggestedText,
      });
      hasApproved = true;

      txOperations.push(
        prisma.curriculumSuggestion.update({
          where: { id: suggestion.id },
          data: {
            status: "APPROVED",
            suggestedText: finalSuggestedText,
            resolvedAt: now,
          },
        })
      );
    } else if (decision.action === "REJECT") {
      txOperations.push(
        prisma.curriculumSuggestion.update({
          where: { id: suggestion.id },
          data: {
            status: "REJECTED",
            resolvedAt: now,
          },
        })
      );
    }
  }

  if (hasApproved) {
    txOperations.push(
      prisma.curriculumDocument.update({
        where: { id: doc.id },
        data: {
          previousBackup: doc.content,
          content: updatedContent,
        },
      })
    );
  }

  if (txOperations.length > 0) {
    await prisma.$transaction(txOperations);
  }

  if (hasApproved) {
    await syncOfficialCurriculumMd(updatedContent);
  }

  revalidatePath("/");
  return { content: updatedContent };
}

export async function triggerCurriculumAnalysisNow() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const result = await runCurriculumAnalysisForUser(session.user.email);
  revalidatePath("/");
  return result;
}

export async function undoLastCurriculumChange() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const userEmail = session.user.email;
  const doc = await prisma.curriculumDocument.findUnique({
    where: { userEmail },
  });

  if (!doc || !doc.previousBackup) {
    throw new Error("Não há versão anterior disponível para desfazer.");
  }

  const restoredContent = doc.previousBackup;
  const updated = await prisma.curriculumDocument.update({
    where: { id: doc.id },
    data: {
      content: restoredContent,
      previousBackup: null,
    },
  });

  await syncOfficialCurriculumMd(restoredContent);
  revalidatePath("/");
  return updated;
}
