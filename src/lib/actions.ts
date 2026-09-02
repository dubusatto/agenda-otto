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
    },
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
  });

  return tasks;
}

export async function toggleScheduledTaskCompletion(id: string, completed: boolean) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const baseId = id.split('-')[0];
  const task = await prisma.scheduledTask.findUnique({ where: { id: baseId } });
  if (!task || task.userEmail !== session.user.email) throw new Error("Unauthorized");

  const updated = await prisma.scheduledTask.update({
    where: { id: baseId },
    data: { completed },
  });

  revalidatePath("/");
  return updated;
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
