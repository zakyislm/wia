# Tutor

Tutorial eksperimen/kontribusi buat projek wia.

## Branching

Repo ini bakal pake branching biar gampang ngelola:

*   **`master`** Branch primary buat *ready prod* bakal nampilin kodingan yg udh ready buat kumpul/fix/sepakt.
*   **Branch tiap orang:** Setiap org punya branch kerja mandiri pke penamaan terserah (wajib 1 doang):
    ```
    [nama-branch-lu]/[slug]
    ```
    *Contoh: `jek/fitur-auth`, `alex/tampilan-dashboard`*

## Flow

Buat masukin hal yg berubah ke branch utama, ikutin tutor ini:

1.  **Pull Paling Awal:** Pastikan branch lokal kamu sudah mengambil pembaruan terbaru dari master.
    ```bash
    git checkout master
    git pull origin master
    git checkout [branch-kamu]
    git merge master
    ```
2.  **Kembangkan Fitur:** Selesaikan tugas/fitur di branch masing-masing.
3.  **Ajukan Pull Request (PR):** Buka PR dari branch fitur kamu ke branch `master`.
4.  **Proses Penggabungan (Merge):** 
    *   Setiap PR wajib ditinjau (*review*) terlebih dahulu oleh Ketua Tim.
    *   Penggabungan kode ke `master` wajib menggunakan opsi **Squash and Merge** agar riwayat komit utama tetap bersih, ringkas, dan mudah dilacak.

## Format

*   Pake msg komit yg jelas, singkat, dan deskriptif.
*   Jgn pake msg komit yg aneh kyk *"fix"*, *"update"*, atau *"test"*.
*   Format msg komit yang bagus:
    ```
    [fitur/bug/refactor]: deskripsi singkat perubahan
    ```
    *Contoh: `[fitur]: integrasi komponen navbar responsif`*
