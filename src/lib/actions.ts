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

  const task = await prisma.scheduledTask.create({
    data: {
      ...data,
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
    await prisma.scheduledTask.update({
      where: { id: baseId },
      data: { completed }
    });
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
