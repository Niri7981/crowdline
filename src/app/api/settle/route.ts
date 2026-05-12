import { NextResponse } from "next/server";
import { z } from "zod";

import { anchorRoundProof } from "@/lib/server/onchain/anchor-round-proof";
import { mapRoundToState } from "@/lib/server/rounds/map-round-state";
import { settleRound } from "@/lib/server/rounds/settle-round";

const settleRoundPayloadSchema = z.object({
  roundId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const rawPayload = (await request.json().catch(() => ({}))) as unknown;
    const payload = settleRoundPayloadSchema.parse(rawPayload);
    // 这里在干嘛：
    // 结算最新一场 duel，再把它的 proof 锚定到本地链。
    // 为什么这么写：
    // settle 是数据库事务，anchor 是链上交易。
    // 如果 anchor 失败，结算结果不能丢；但前端必须知道链上锚定有没有成功，
    // 否则 UI 只会一直显示 Pending 而看不到原因。
    // 最后返回什么：
    // 返回 RoundState 加一份 anchor 字段。
    // anchor.ok=true 时附带 signature / pda；ok=false 时附带 error 文案。
    const round = await settleRound({
      roundId: payload.roundId,
    });
    const anchorResult = await anchorRoundProof(round.id);
    const roundState = await mapRoundToState(round);

    if (!anchorResult.ok) {
      console.warn("Battle proof localnet anchor failed", {
        error: anchorResult.error,
        roundId: round.id,
      });
    }

    return NextResponse.json({
      ...roundState,
      anchor: anchorResult.ok
        ? {
            error: null,
            ok: true as const,
            onchainProofAddress: anchorResult.onchainProofAddress,
            onchainSignature: anchorResult.onchainSignature,
            proofHash: anchorResult.proofHash,
          }
        : {
            error: anchorResult.error,
            ok: false as const,
          },
    });
  } catch (error) {
    console.error("Failed to settle round", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid settle payload.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to settle duel round.",
      },
      { status: 500 },
    );
  }
}
