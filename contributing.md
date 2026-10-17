# Tutor

Tutorial eksperimen/kontribusi buat projek wia.

## Branching

Repo ini bakal pake branching biar gampang ngelola:

*   **`master`** Branch primary buat *ready prod* bakal nampilin kodingan yg udh ready buat kumpul/fix/sepakt.
*   **Branch tiap orang:** Setiap org punya branch kerja mandiri pke penamaan terserah (wajib 1 doang):
    ```
    [nama-branch-lu]
    ```
    *Contoh: branch `jek` atau `alex`*

## Flow

Buat masukin hal yg berubah ke branch utama, ikutin tutor ini:

1.  **Pull Paling Awal:** Pastikan branch kamu selalu dapet update-an terbaru dari master sebelum mulai ngoding baru, biar nggak bentrok:
    ```bash
    git checkout [branch-kamu]
    git pull origin master
    ```
2.  **Kembangkan Fitur:** Selesaikan tugas/fitur di branch masing-masing. Jangan lupa lakukan `git add` dan `git commit` di terminal lokal kamu.
3.  **Push ke GitHub:** Setelah selesai commit di laptop, kirim kodingan branch kamu ke GitHub:
    ```bash
    git push origin [branch-kamu]
    ```
4.  **Ajukan Pull Request (PR):** Buka repositori di halaman GitHub, lalu klik tombol **Create Pull Request** dari branch kamu ke branch `master`.
5.  **Proses Penggabungan (Merge):** 
    *   Setiap PR wajib ditinjau (*review*) terlebih dahulu oleh Ketua Tim.
    *   Penggabungan kode ke `master` bakal di-execute pake opsi **Squash and Merge** biar riwayat komit utama tetep bersih, ringkas, dan gampang dilacak.

## Format

*   Pake msg komit yg jelas, singkat, dan deskriptif.
*   Jgn pake msg komit yg aneh kyk *"fix"*, *"update"*, atau *"test"*.
*   Format msg komit yang bagus:
    ```
    [fitur/bug/refactor]: deskripsi singkat perubahan
    ```
    *Contoh: `[fitur]: integrasi komponen navbar responsif` atau `[fitur]: auth fitur dan oauth integrasi`*
