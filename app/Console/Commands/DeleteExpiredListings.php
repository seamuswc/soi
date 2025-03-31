<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Listing;

class DeleteExpiredListings extends Command
{
    protected $signature = 'listings:delete-expired';
    protected $description = 'Delete listings that are more than 30 days old';

    public function handle()
    {
        $count = Listing::where('expires_at', '<', now())->delete();
        $this->info("Deleted $count expired listings.");
    }
}
