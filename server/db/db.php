<?php

/* MusicHive Database Handler
 * @package musichive
 * @author musichive
 * @version Alpha 1
 */

class ClientDB extends SQLite3
{
    function __construct()
    {
        $this->open('/usr/share/nginx/html/server/db/db.sqlite');
        $this->busyTimeout(5000);
    }
}
?>
