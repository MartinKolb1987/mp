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
        $this->open('/www/htdocs/w0120ad6/server/db/db.sqlite');
        $this->busyTimeout(5000);
    }
}
?>
