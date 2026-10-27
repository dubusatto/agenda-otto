"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
      orderBy: { startTime: 'desc' }
    });

    if (activeEntry) {
      await prisma.timeEntry.update({
        where: { id: activeEntry.id },
        data: { endTime: new Date() }
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

  revalidatePath("/");
}
