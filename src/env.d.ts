/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    /** Staf yang sedang masuk; diisi middleware untuk halaman dashboard. */
    staff?: import('./server/auth/session').Staff;
  }
}
