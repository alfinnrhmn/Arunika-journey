import { z } from 'zod';
import type { getDb } from '../db';
import { uuidv7 } from '../db/id';
import { accounts, users } from '../db/schema';
import { getAuth, MIN_PASSWORD_LENGTH } from './auth';
import type { Role } from './permissions';

type Db = ReturnType<typeof getDb>;

/**
 * Membuat akun staf (Owner atau Admin Operasional) dengan email + sandi. Tidak ada pendaftaran publik: akun
 * hanya dibuat lewat jalur ini (skrip `npm run user:create`, nanti undangan dari halaman Pengguna oleh Owner).
 * Sandi di-hash dengan algoritma bawaan Better Auth dan tidak pernah disimpan atau dikembalikan dalam bentuk asli.
 */
export class UserError extends Error {
  readonly code: 'invalid' | 'duplicate';
  readonly issues: string[];
  constructor(code: 'invalid' | 'duplicate', issues: string[]) {
    super(issues.join('; '));
    this.name = 'UserError';
    this.code = code;
    this.issues = issues;
  }
}

const inputSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Format email belum benar')),
  name: z.string().trim().min(2, 'Nama minimal 2 huruf').max(100),
  role: z.enum(['owner', 'admin_ops']),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Sandi minimal ${MIN_PASSWORD_LENGTH} karakter`)
    .max(128, 'Sandi maksimal 128 karakter'),
});

export async function createStaffUser(
  db: Db,
  input: { email: string; name: string; role: Role; password: string },
): Promise<{ id: string; email: string; role: Role }> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success)
    throw new UserError(
      'invalid',
      parsed.error.issues.map((i) => i.message),
    );
  const { email, name, role, password } = parsed.data;
  if (password.toLowerCase() === email) {
    throw new UserError('invalid', ['Sandi tidak boleh sama dengan email']);
  }

  const ctx = await getAuth().$context;
  const hash = await ctx.password.hash(password);
  const id = uuidv7();

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(users)
        .values({ id, email, name, role, status: 'active', emailVerified: true });
      await tx
        .insert(accounts)
        .values({ accountId: id, providerId: 'credential', userId: id, password: hash });
    });
  } catch (e) {
    const cause = ((e as { cause?: unknown })?.cause ?? e) as { code?: string };
    if (cause.code === '23505') throw new UserError('duplicate', ['Email sudah terdaftar']);
    throw e;
  }
  return { id, email, role };
}
