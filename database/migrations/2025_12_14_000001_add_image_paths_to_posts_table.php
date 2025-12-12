<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->json('image_paths')->nullable()->after('content');
        });

        DB::table('posts')
            ->whereNotNull('image_path')
            ->orderBy('id')
            ->chunkById(100, function ($posts) {
                foreach ($posts as $post) {
                    DB::table('posts')
                        ->where('id', $post->id)
                        ->update([
                            'image_paths' => json_encode([$post->image_path]),
                        ]);
                }
            });

        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn('image_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->string('image_path')->nullable()->after('content');
        });

        DB::table('posts')
            ->whereNotNull('image_paths')
            ->orderBy('id')
            ->chunkById(100, function ($posts) {
                foreach ($posts as $post) {
                    $paths = json_decode($post->image_paths, true);
                    DB::table('posts')
                        ->where('id', $post->id)
                        ->update([
                            'image_path' => $paths[0] ?? null,
                        ]);
                }
            });

        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn('image_paths');
        });
    }
};
