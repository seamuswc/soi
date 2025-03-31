protected function schedule(Schedule $schedule)
{
    $schedule->command('listings:delete-expired')->daily();
}
