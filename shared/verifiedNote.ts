/**
 * 確認情報（verifiedNote）の表示用パース。
 *
 * 確認内容を1つの段落に詰めると項目の境目が分からず読めないため、
 * 「ラベル: 値」を1行1項目として書き、表示側で行に分けて並べる。
 *  - ※ で始まる行は出典・注記としてパネル末尾にまとめる
 *  - ラベルが取れない行は、ラベルなしの本文行として扱う（旧データの互換）
 */

export type VerifiedNoteRow = { label: string | null; value: string };

export function parseVerifiedNote(note: string | null | undefined): {
  rows: VerifiedNoteRow[];
  footnotes: string[];
} {
  const rows: VerifiedNoteRow[] = [];
  const footnotes: string[] = [];

  for (const raw of (note ?? "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("※")) {
      footnotes.push(line.replace(/^※\s*/, ""));
      continue;
    }
    // ラベルは行頭から最初のコロンまで。長さを16文字までに制限し、空白を含むものは弾く。
    // コロンの直後が「/」の場合はURLのスキーム（https://…）なのでラベルとして扱わない。
    const m = line.match(/^([^:：\s]{2,16})[:：]\s*(?!\/)(.+)$/);
    rows.push(m ? { label: m[1], value: m[2] } : { label: null, value: line });
  }

  return { rows, footnotes };
}
