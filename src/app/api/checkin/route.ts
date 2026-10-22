import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    // 1. Validação de Segurança
    const authHeader = request.headers.get('authorization');
    const secretToken = process.env.AGENDA_API_TOKEN; 
    
    // Confere se o token existe e se a senha bate
    if (!secretToken || authHeader !== `Bearer ${secretToken}`) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }

    // 2. Extrair o resumo enviado pelo Claude
    const body = await request.json();
    const { resumo } = body;

    if (!resumo) {
      return NextResponse.json({ error: 'Nenhum resumo fornecido' }, { status: 400 });
    }

    // 3. Buscar a sessão de trabalho ativa (tempo rolando = endTime é nulo)
    const activeTimeEntry = await prisma.timeEntry.findFirst({
      where: {
        endTime: null,
      },
      orderBy: {
        startTime: 'desc', // Pega a mais recente para garantir
      }
    });

    if (!activeTimeEntry) {
      return NextResponse.json({ 
        error: 'Nenhuma sessão de trabalho ativa (com tempo rolando) foi encontrada.' 
      }, { status: 404 });
    }

    // 4. Criar o Check-in vinculado a essa sessão
    await prisma.checkIn.create({
      data: {
        timeEntryId: activeTimeEntry.id,
        note: resumo,
      }
    });
    
    revalidatePath('/');
    console.log("Check-in salvo com sucesso via Claude Code MCP!");

    // 5. Retorno de Sucesso
    return NextResponse.json({ 
      success: true, 
      message: 'Check-in registrado com sucesso' 
    }, { status: 200 });

  } catch (error) {
    console.error("Erro ao registrar check-in:", error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}