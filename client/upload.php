<?php

// downvote song
print $_POST['type']; // = downvoteTrack
print $_POST['trackId'];

// upload song
print $_POST['type']; // = uploadTrack
print $_POST['file']; // base64encoded string
print $_POST['filename'];
// print $_FILES['file']

// remove song
print $_POST['type']; // = removeTrack
print $_POST['trackId'];

// swap song
print $_POST['type']; // = swapTrack
print $_POST['trackIds'][0]; // track 1
print $_POST['trackIds'][1]; // track 2
