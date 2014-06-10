<?php

/* MusicHive User Administration
 * @package musichive
 * @author musichive
 * @version Alpha 1
 */

// includes
require_once('db/db.php');

// global variables
$uploadDirectory = getenv("DOCUMENT_ROOT") . '/server/userdata/';
$truePath = '/usr/share/nginx/html/server/userdata/';
$clientIp = checkUser();


/* getClientIp()
 * @return String u_ip - remote address of user calling the script
 */
function getClientIP() {
    if (isset($_SERVER)) {
        if (isset($_SERVER["HTTP_X_FORWARDED_FOR"]))
            return $_SERVER["HTTP_X_FORWARDED_FOR"];
        if (isset($_SERVER["HTTP_CLIENT_IP"]))
            return $_SERVER["HTTP_CLIENT_IP"];
        return $_SERVER["REMOTE_ADDR"];
    }
}


/* checkUser()
 * Check database for user, create user if necessary
 * @return String u_ip - remote address of user calling the script
 */
function checkUser() {
    // initialize database   
    $db = new ClientDB();
    $currentIP = getClientIP();
    
    // get user entries with current user ip
    $currentUserQuery = $db->query("SELECT COUNT(u_ip) FROM users WHERE u_ip='$currentIP'");
    $currentUserRow = $currentUserQuery->fetchArray(SQLITE3_ASSOC);
    $currentUserCount = $currentUserRow['COUNT(u_ip)'];
    
    // close db
    $db->close();
    unset($db);

    //echo 'this user ip is ' . $currentUserCount . ' times in the db<br/>';
    
    // if count = 0, create new user
    if ($currentUserCount == 0) {
        //echo('creating new user:</br>' . $currentIP . '</br>');
        return(createUser($currentIP));
    } else {
        //echo('User already in db!</br>' . $currentIP . '</br>');
        return $currentIP;
    }
}


/* createUser()
 * Add user to database and create user directory
 * @param String $currentIP current user ip
 * @return String u_ip - remote address of user calling the script
 */
function createUser($currentIP) {
    // initialize database   
    $db = new ClientDB();   
    global $uploadDirectory;
    global $truePath;
    
    // first user will become admin, so check if first user
    $admin = 0;
    $countAllUsersQuery = $db->query("SELECT COUNT(u_ip) FROM users");
    $countAllUsersRow = $countAllUsersQuery->fetchArray(SQLITE3_ASSOC);
    $userCount = $countAllUsersRow['COUNT(u_ip)'];
    
    //echo 'there are ' . $userCount . ' users in the db<br/>';
    
    if ($userCount == 0) {
        $admin = 1;
    }
    
    // insert data
    if ( $db->exec("INSERT INTO users (u_ip, u_picture, u_admin) VALUES ('$currentIP', 'default.png', '$admin')") == false ) {
        die('error: sqlite exec failed (createUser() - insert data)');
    }
    
    // close db
    $db->close();
    unset($db);
    
    // create user directory
    $path = $uploadDirectory . $currentIP;
    //echo 'user path: ' . $path . '</br>';
    
    if (file_exists($path)) {
        //echo 'folder already exists <br/>';
        // recursive delete of files & folder
        //shell_exec('rm ' . $truePath . $currentIP . ' -R');
    } else {
        mkdir($path, 0777);
        //echo 'create new user folder <br/>';
    }
    
    return($currentIP);
}


/* setPicture()
 * Add user picture to database
 * @param String path to picture
 * @return Boolean true on success
 */
function setPicture($path) {
    // initialize database   
    $db = new ClientDB();
    global $clientIp;
    
    if ( $db->exec("UPDATE users SET u_picture = '$path' WHERE u_ip='$clientIp'") == false ) {
        die('error: sqlite exec failed (setPicture() update)');
    }
    
    // close db
    $db->close();
    unset($db);
    
    return true;
}


/* deletePicture()
 * Remove user picture from database
 * @return Boolean true on success
 */
function deletePicture() {
    // initialize database   
    $db = new ClientDB();
    global $clientIp;
    
    if ( $db->exec("UPDATE users SET u_picture = 'default.png' WHERE u_ip='$clientIp'") == false ) {
        die('error: sqlite exec failed (deletePicture() update)');
    }
    
    // close db
    $db->close();
    unset($db);
    
    return true;
}

?>
