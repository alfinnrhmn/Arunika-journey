/**
 * Membuat akun staf (Owner atau Admin Operasional).
 *
 *   npm run user:create -- --email owner@contoh.id --name "Nama Lengkap" --role owner
 *
 * Sandi dimasukkan di terminal (tersembunyi, diketik dua kali) dan TIDAK dicetak ke layar atau log. Untuk
 * otomatisasi (mis. CI atau pemasangan awal di server) sandi dapat diberikan lewat variabel lingkungan
 * ARUNIKA_USER_PASSWORD; jangan menaruhnya di argumen perintah karena tersimpan di riwayat shell.
 */
import { closeDb, getDb } from '../src/server/db';
import { createStaffUser, UserError } from '../src/server/auth/users';
import type { Role } from '../src/server/auth/permissions';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Membaca baris dari terminal tanpa menampilkan ketikan. */
function promptHidden(label: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(label);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let buf = '';
    const onData = (chunk: string) => {
      for (const c of chunk) {
        if (c === '\r' || c === '\n' || c === '\u0004') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(buf);
          return;
        }
        if (c === '\u0003') process.exit(130); // Ctrl+C
        if (c === '\u007f' || c === '\b') buf = buf.slice(0, -1);
        else buf += c;
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  const email = arg('email');
  const name = arg('name');
  const role = arg('role');
  if (!email || !name || (role !== 'owner' && role !== 'admin_ops')) {
    console.error(
      'Pemakaian: npm run user:create -- --email <email> --name "<nama>" --role <owner|admin_ops>',
    );
    process.exit(1);
  }

  let password = process.env.ARUNIKA_USER_PASSWORD;
  if (!password) {
    if (!process.stdin.isTTY) {
      console.error(
        'Tidak ada terminal interaktif. Jalankan di terminal Anda sendiri, atau berikan sandi lewat ARUNIKA_USER_PASSWORD.',
      );
      process.exit(1);
    }
    password = await promptHidden('Sandi (minimal 12 karakter): ');
    const again = await promptHidden('Ulangi sandi: ');
    if (password !== again) {
      console.error('Sandi tidak sama.');
      process.exit(1);
    }
  }

  try {
    const user = await createStaffUser(getDb(), { email, name, role: role as Role, password });
    console.log(`Akun dibuat: ${user.email} (${user.role}). Masuk di /dashboard/masuk`);
  } catch (e) {
    if (e instanceof UserError) {
      console.error(`Gagal: ${e.issues.join('; ')}`);
      process.exitCode = 1;
    } else {
      throw e;
    }
  } finally {
    await closeDb();
  }
}

await main();
