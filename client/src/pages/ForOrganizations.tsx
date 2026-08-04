import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect } from "react";

/**
 * 登録支援機関向け：自社情報の確認・修正（無料）の案内ページ。
 * 重要：確認済みステータス（掲載情報 運営確認済み）になる手段は無料で全機関に開かれており、
 * 有料プランと確認ステータスは一切連動しない。
 */
export default function ForOrganizations() {
  useEffect(() => {
    document.title = "登録支援機関の皆さまへ｜自社情報の確認・修正（無料） - ヤトエル";
    return () => {
      document.title = "登録支援機関を条件で比較｜ヤトエル";
    };
  }, []);

  return (
    <SiteLayout>
      <div className="container max-w-3xl py-12">
        <div className="text-center mb-10">
          <Badge variant="secondary" className="mb-3">登録支援機関の皆さまへ</Badge>
          <h1 className="text-3xl font-bold mb-3">自社情報を確認・修正する（無料）</h1>
          <p className="text-muted-foreground leading-relaxed">
            ヤトエルは、出入国在留管理庁の登録支援機関登録簿をもとに全機関の情報を掲載しています。
            掲載内容の確認・修正・追加情報の登録は、<strong className="text-foreground">すべての機関が無料</strong>で行えます。
          </p>
        </div>

        <Card className="border-2 border-emerald-500/40 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              「掲載情報 運営確認済み」表示について
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed space-y-3">
            <p>
              運営が事業者に掲載内容を直接確認できた場合、機関ページに
              <span className="font-bold text-emerald-700">「掲載情報 運営確認済み：確認日」</span>
              を表示し、確認済みの項目（新規受入企業の相談受付状況・希望する相談条件・対応言語など）を登録簿由来の情報と区別して掲載します。
            </p>
            <p>
              また、親和性スコアの信頼性枠（10点）のうち最大5点を「実確認鮮度」として加点します（確認日から時間経過で減衰します）。
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-brand" />
              費用は一切かかりません
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed space-y-2">
            <p>
              情報の確認・修正、および「運営確認済み」ステータスの取得は<strong>無料</strong>です。
              有料掲載の有無と確認ステータス・親和性スコアは一切連動しません。
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>掲載情報の誤りの修正（対応言語・所在地など）</li>
              <li>新規受入企業の相談受付状況の掲載</li>
              <li>希望する相談条件（受けたい業種・地域）の掲載</li>
              <li>通称・サービス名（エイリアス）の登録</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-brand" />
              確認・修正のご依頼方法
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed space-y-4">
            <p>
              下記メールアドレス（info@ubusunaworks.jp）宛に、<strong>機関名・登録番号・ご担当者名・修正または確認したい内容</strong>をお送りください。
              運営が事業者に確認のうえ、通常5営業日以内に反映します。
            </p>
            <Button
              size="lg"
              className="w-full sm:w-auto bg-amber-accent text-brand font-bold hover:bg-amber-accent/90"
              onClick={() => {
                window.location.href =
                  "mailto:info@ubusunaworks.jp?subject=" +
                  encodeURIComponent("【掲載情報の確認・修正依頼】") +
                  "&body=" +
                  encodeURIComponent(
                    "機関名：\n登録番号：\nご担当者名：\nご連絡先：\n確認・修正したい内容：\n"
                  );
              }}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              メールで確認・修正を依頼する（無料）
            </Button>
            <p className="text-xs text-muted-foreground">
              なりすまし防止のため、登録簿記載の連絡先または公式ドメインのメールアドレスからのご連絡をお願いする場合があります。
            </p>
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}
