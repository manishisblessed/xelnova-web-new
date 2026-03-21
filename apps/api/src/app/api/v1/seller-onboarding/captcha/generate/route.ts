import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { setCaptcha, cleanupExpiredCaptchas } from '@/lib/captcha-store';

function generatePuzzle() {
  const puzzleTypes = ['math', 'count', 'sequence'];
  const type = puzzleTypes[Math.floor(Math.random() * puzzleTypes.length)];

  if (type === 'math') {
    const a = Math.floor(Math.random() * 20) + 5;
    const b = Math.floor(Math.random() * 15) + 3;
    const ops = ['+', '-', '*'] as const;
    const op = ops[Math.floor(Math.random() * ops.length)];
    let answer: number;
    switch (op) {
      case '+': answer = a + b; break;
      case '-': answer = a - b; break;
      case '*': answer = a * b; break;
    }
    const wrongAnswers = new Set<number>();
    while (wrongAnswers.size < 3) {
      const offset = Math.floor(Math.random() * 10) - 5;
      if (offset !== 0) wrongAnswers.add(answer + offset);
    }
    const options = [answer, ...wrongAnswers].sort(() => Math.random() - 0.5);
    return {
      instruction: `What is ${a} ${op} ${b}?`,
      display: `${a} ${op} ${b} = ?`,
      options,
      answer: answer.toString(),
    };
  }

  if (type === 'count') {
    const shapes = ['circles', 'squares', 'stars', 'triangles'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const count = Math.floor(Math.random() * 6) + 3;
    const emoji = shape === 'circles' ? '●' : shape === 'squares' ? '■' : shape === 'stars' ? '★' : '▲';
    const display = Array(count).fill(emoji).join(' ');
    const wrongAnswers = new Set<number>();
    while (wrongAnswers.size < 3) {
      const offset = Math.floor(Math.random() * 4) + 1;
      const wrong = count + (Math.random() > 0.5 ? offset : -offset);
      if (wrong > 0 && wrong !== count) wrongAnswers.add(wrong);
    }
    while (wrongAnswers.size < 3) wrongAnswers.add(count + wrongAnswers.size + 1);
    const options = [count, ...wrongAnswers].sort(() => Math.random() - 0.5);
    return {
      instruction: `How many ${shape} do you see?`,
      display,
      options,
      answer: count.toString(),
    };
  }

  // sequence
  const start = Math.floor(Math.random() * 10) + 1;
  const step = Math.floor(Math.random() * 5) + 2;
  const sequence = Array.from({ length: 4 }, (_, i) => start + step * i);
  const answer = start + step * 4;
  const wrongAnswers = new Set<number>();
  while (wrongAnswers.size < 3) {
    const offset = Math.floor(Math.random() * 6) - 3;
    if (offset !== 0) wrongAnswers.add(answer + offset);
  }
  const options = [answer, ...wrongAnswers].sort(() => Math.random() - 0.5);
  return {
    instruction: `What comes next? ${sequence.join(', ')}, ?`,
    display: sequence.join(', ') + ', ?',
    options,
    answer: answer.toString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = randomUUID();
    const puzzle = generatePuzzle();

    setCaptcha(sessionId, {
      answer: puzzle.answer,
      expiresAt: Date.now() + 5 * 60 * 1000,
      solved: false,
    });

    cleanupExpiredCaptchas();

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        puzzle: {
          instruction: puzzle.instruction,
          display: puzzle.display,
          options: puzzle.options,
        },
      },
    });
  } catch (error) {
    console.error('Captcha generate error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate captcha' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Role',
    },
  });
}
