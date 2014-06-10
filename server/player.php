<?php

/* MusicHive Music Player Web Service
 * @package musichive
 * @author musichive
 * @version Alpha 1
 */

// includes
require_once('db/db.php');
require_once('users.php');
require_once('tracks.php');


/* execAction()
 * Determine what to do, depending on client $_POST['type']
 * Rendered output will be text or JSON
 */
function execAction() {
    $action = $_GET['type'];
    // get action
    if(empty($action)) {
        // debug mode
        die('error: no action specified (GET type)');
    }
    
    switch($action){
        case 'getTrack':
            // return should be true on success
            $returnMsg = getTrackToPlay();
            if($returnMsg) {
                header('Content-type: text/plain');
                echo $returnMsg;
            }
            break;
        
        case 'playbackFinished':
            // sanity check - empty input
            if (empty($_GET['filename'])) {
                die('error: no filename specified (execAction() - playbackFinished)');
            } else {
                $returnMsg = playbackFinished($_GET['filename']);
				if($returnMsg) {
					echo '1';
				} else {
					echo '0';
				}
            }
            break;
        
        case 'abortPlayback':
            $returnMsg = abortPlayback();
            header('Content-type: text/plain');
            echo $returnMsg;
            break;
    }
}

/* getTrackToPlay()
 * Music player will ask for the new track to be played after the current track has finished
 * @return String filename and path of title to play, 'empty' if nothing to play
 */
function getTrackToPlay() {

	// get active bucket from bucket table
    $activeBucketId = getActiveBucket();

    // initialize database
    $db = new ClientDB();
	
	// check if a track is currently playing
	$currentlyPlayingTrackQuery = $db->query("SELECT COUNT(t_id) FROM bucketcontents WHERE b_id = $activeBucketId AND b_currently_playing = 1");
    $currentlyPlayingTrackCountRow = $currentlyPlayingTrackQuery->fetchArray(SQLITE3_ASSOC);
    $currentlyPlayingTrackCount = $currentlyPlayingTrackCountRow['COUNT(b_id)'];
	if ($currentlyPlayingTrackCount == 1) {
		// replay currently playing track
		$currentlyPlayingFilename;
		$currentlyPlayingQuery = $db->query("SELECT t.t_filename FROM bucketcontents b INNER JOIN tracks t ON b.t_id = t.t_id WHERE b.b_currently_playing = 1");
		$currentlyPlayingCountRow = $currentlyPlayingQuery->fetchArray(SQLITE3_ASSOC);
		$currentlyPlayingFilename = $currentlyPlayingCountRow['t_filename'];
		
		//echo ('playing same track again. <br/>');
		
		return $currentlyPlayingFilename;
		
	}

    // get all unplayed tracks within the active bucket)
    $bucketTracksQuery = $db->query("SELECT COUNT(t_id) FROM bucketcontents WHERE b_id = $activeBucketId AND b_played = 0");
    $bucketTracksCountRow = $bucketTracksQuery->fetchArray(SQLITE3_ASSOC);
    $bucketTracksCount = $bucketTracksCountRow['COUNT(t_id)'];

    // switch to next bucket if every track in active bucket is played and next bucket exists
    if ($bucketTracksCount = 0) {
        //echo('error: there are no more unplayed tracks within the active bucket! Switching to next bucket.<br/>');

        // look if next bucket exists
        $nextActiveBucketId = $activeBucketId + 1;
        $nextBucket = $db->query("SELECT COUNT(b_id) FROM buckets WHERE b_id = $nextActiveBucketId");
        $nextBucketCountRow = $nextBucket->fetchArray(SQLITE3_ASSOC);
        $nextBucketCount = $nextBucketCountRow['COUNT(b_id)'];
        if ($nextBucketCount = 0) {
            //echo('error: there are no more buckets to play from.<br/>');

            // close db
            $db->close();
            unset($db);

            return 'empty';
        }

        // switch buckets 
        $db->query("UPDATE buckets SET b_is_active = 0 WHERE b_id = $activeBucketId");
        $db->query("UPDATE buckets SET b_is_active = 1 WHERE b_id = $nextActiveBucketId");
        $activeBucketId = $nextActiveBucketId;

        // look if next bucket is empty
        $bucketTracksQuery = $db->query("SELECT COUNT(t_id) FROM bucketcontents WHERE b_id = $activeBucketId AND b_played = 0");
        $bucketTracksCountRow = $bucketTracksQuery->fetchArray(SQLITE3_ASSOC);
        $bucketTracksCount = $bucketTracksCountRow['COUNT(t_id)'];
        if ($bucketTracksCount = 0) {
            //echo('error: the next bucket is empty.<br/>');

            // close db
            $db->close();
            unset($db);

            return 'empty';
        }

    }

    // get all unplayed tracks within the active bucket
    $unplayedTracksQuery = $db->query("SELECT t_id FROM bucketcontents WHERE b_id = $activeBucketId AND b_played = 0");

    // push the t_ids of the unplayed tracks into an array
    $unplayedBucketTracks = [];
	while ($row = $unplayedTracksQuery->fetchArray(SQLITE3_ASSOC)) {
        array_push($unplayedBucketTracks, (int)$row['t_id']);
    }
    /*echo ('BucketPlaylist:');
    print_r($unplayedBucketTracks);
    echo ('<br/>');*/

    // count the tracks within the array
    $bucketTracksCount = ((int)count($unplayedBucketTracks) - 1);

    // get a random track within all unplayed tracks
    $randomTrackNumber = rand(0, $bucketTracksCount);

    // get the id of the random track
    $randomTrackId = $unplayedBucketTracks[$randomTrackNumber];

    // get the u_ip and t_filename from the random track
    $randomTrackFilename;
    $randomTrackQuery = $db->query("SELECT t_filename FROM tracks WHERE t_id = $randomTrackId");

    while ($row = $randomTrackQuery->fetchArray(SQLITE3_ASSOC)) {
        $randomTrackFilename = $row['t_filename'];
    }

    //echo ('next song to be played: --- t_id: '.$randomTrackId.' - t_filename: '.$randomTrackFilename.'<br/>');

    // set the status of the random track to currently_playing
    $db->query("UPDATE bucketcontents SET b_currently_playing = 1 WHERE t_id=$randomTrackId");

    // close db
    $db->close();
    unset($db);
    
    // return the u_id and t_filename of the random track
    return $randomTrackFilename;
}


/* playbackFinished()
 * Music player will call this after playback has finished
 * @param String $finishedTrack filename and path of finished title
 * @return 1 on success, 0 on fail
 */
function playbackFinished($t_filename) {

    // initialize database
    $db = new ClientDB();

    // get the t_id from the finished track with the t_filename
    $finishedTrackId;
    $finishedTrackQuery = $db->query("SELECT t_id FROM tracks WHERE t_filename = '$t_filename'");
    while ($row = $finishedTrackQuery->fetchArray(SQLITE3_ASSOC)) {
        $finishedTrackId = $row['t_id'];
    }

    //echo ('finished track id: '.$finishedTrackId.'<br/>');

	//update track-status
    $db->exec("UPDATE bucketcontents SET b_currently_playing = 0, b_played = 1 WHERE t_id = '$finishedTrackId'");

	return true;

    // close db
    $db->close();
    unset($db);
}


/* abortPlayback()
 * Music player will ask every 10s if the track should be aborted
 * @return Integer 0 = play, 1 = abort
 */
function abortPlayback() {

    // initialize database
    $db = new ClientDB();

    // get user count
    $usersQuery = $db->query("SELECT COUNT(u_ip) FROM users");
    $usersCountRow = $usersQuery->fetchArray(SQLITE3_ASSOC);
    $usersCount = $usersCountRow['COUNT(u_ip)'];

    // get currently played track
    $currentTrackId;
    $currentTrackQuery = $db->query("SELECT t_id FROM bucketcontents WHERE b_currently_playing = 1");
    while ($row = $currentTrackQuery->fetchArray(SQLITE3_ASSOC)) {
        $currentTrackId = $row['t_id'];
    }

    // get the current downvote-count from the played track
    $downvoteQuery = $db->query("SELECT COUNT(u_ip) FROM downvotes WHERE t_id = '$currentTrackId'");
    $downvoteCountRow = $downvoteQuery->fetchArray(SQLITE3_ASSOC);
    $downvoteCount = $downvoteCountRow['COUNT(u_ip)'];

    // close db
    $db->close();
    unset($db);

    // decide if downvotes are over 50% to abort the playback
    if ($downvoteCount > ($usersCount / 2)) {
        return 1;
    } else {
        return 0;
    }
    
}

execAction();

?>
