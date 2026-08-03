export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// 旧Manus OAuthへの外部リダイレクトを廃止し、自前のログインページへの遷移に
// 置き換えた。呼び出し側（DashboardLayout・useAuth・entry-client）は
// startLogin() を呼ぶだけの形を維持しているので、このファイル以外は
// 変更していない。
export const startLogin = () => {
  window.location.href = "/admin/login";
};
