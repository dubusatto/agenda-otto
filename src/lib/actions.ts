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
