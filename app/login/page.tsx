import { signIn } from "@/auth";
import Image from "next/image";

export default function Login() {
  return <main className="login-main"><section className="login-card" aria-labelledby="login-title">
    <div className="login-logo"><Image src="/logo-simetri.png" width={94} height={94} alt="Logo Simetri" priority /></div>
    <h1 id="login-title">Monitoring Project</h1>
    <p className="login-subtitle">Masuk untuk melihat perkembangan dan informasi proyek Simetri.</p>
    <form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}>
      <button className="login-google" type="submit"><span className="login-google-icon" aria-hidden="true">G</span>Masuk dengan Google</button>
    </form>
    <p className="login-note">Gunakan akun Google yang sudah diberi izin oleh administrator.</p>
  </section></main>;
}
