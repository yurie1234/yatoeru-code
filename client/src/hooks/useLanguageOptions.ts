import { trpc } from "@/lib/trpc";
import { MAJOR_LANGUAGES } from "@shared/tokutei";

export interface LanguageOption {
  language: string;
  /** 対応機関数。サーバーから取れなかった場合は null */
  count: number | null;
}

/**
 * 対応言語の絞り込み選択肢を、実データ（機関数つき）で返す。
 *
 * 以前は MAJOR_LANGUAGES の13言語を決め打ちで並べていた。実データには60種類以上
 * あるため、シンハラ語702機関・ベンガル語417機関・ヒンディー語406機関などが
 * **DBには入っているのに選択肢に出ず、探しようがない**状態だった。
 * 決め打ちのリストは必ず実態から取り残されるので、選択肢はデータから作る。
 *
 * サーバーから取れない間（初回描画・通信失敗）は MAJOR_LANGUAGES を出す。
 * 絞り込みが空欄になって何も選べなくなるより、主要言語だけでも出したほうがよい。
 */
export function useLanguageOptions(): { options: LanguageOption[]; isFallback: boolean } {
  const { data } = trpc.orgs.languageFacets.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  if (data?.languages?.length) {
    return { options: data.languages, isFallback: false };
  }
  return {
    options: MAJOR_LANGUAGES.map((language) => ({ language, count: null })),
    isFallback: true,
  };
}

/** 選択肢の表示名。「ヒンディー語（406）」のように対応機関数を添える */
export function languageOptionLabel(o: LanguageOption): string {
  return o.count == null ? o.language : `${o.language}（${o.count}）`;
}
