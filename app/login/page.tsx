import { signIn } from "@/auth";

export default function Login() {
  return <main><section><p>MONITOR PROYEK</p><h1>Akses dashboard</h1><p>Masuk memakai akun Google yang sudah diberi izin oleh administrator.</p><form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}><button>Masuk dengan Google</button></form></section></main>;
}
