var watchDeviceOrientation;

$(document).ready(function() {
    
    // bind nav text hide in mobile to tab show event
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        $('.musichive-nav').each(function() {
            if ($(this).hasClass('active') == true) {
                $(this).children().children(':nth-child(2)').removeClass('hidden-xs');
            } else {
                $(this).children().children(':nth-child(2)').addClass('hidden-xs');
            }
        });
    });
    
    $('#musichive-user-image-upload').click(function() {
        $('#musichive-nav-tabs-settings a').tab('show');
    });

    // Add a media query change listener
    watchDeviceOrientation = window.matchMedia("(orientation: portrait)");
    
    watchDeviceOrientation.addListener(function(m) {
        // window.location.reload();
    });
    
    window.onresize = function(event) {
        toggleBackground();
        scrollInfoText();
    }
    
    // init all needed stuff
    currentlyPlaying.init();
    playList.init();
    uploader.init();
    userImage.init();

    // background and scroll info text
    toggleBackground();
    scrollInfoText();
});


var currentlyPlaying = {

    pollingIntervalValue: 3000,
    playlistUpdateIntervalValue: 1000,
    currentTrackId: 0,
    oldCurrentTrackId: 0,
    oldTrackId: 0,

    internetAccess: '',
    infoUsers: '',
    trackText: '',
    artistText: '',
    albumText: '',
    durationText: '',
    userImage: '',
    downvote: '',

    init: function(){
        this.internetAccess = $('#musichive-info-internet');
        this.infoUsers = $('#musichive-info-users');
        this.trackText = $('#musichive-player-trackid-text');
        this.artistText = $('#musichive-player-artist-text');
        this.albumText = $('#musichive-player-album-text');
        this.durationText = $('#musichive-player-duration-text');
        this.userImage = $('#musichive-user-image');
        this.downvote = $('#musichive-downvote');

        this.getCurrentlyPlayingData();
        this.pollingInterval();
        this.playlistUpdateInterval();
        this.setEventlistener();
    },

    setEventlistener: function(){
        var that = this;
        $('#musichive-track-info').on('click', '#musichive-downvote', function(){
            if(!$(this).hasClass('disabled')){
                that.downvoteSend(that.currentTrackId);
                that.downvote.addClass('disabled');
            }
        });
    },

    getCurrentlyPlayingData: function(){
        var that = this;

        $.ajax({
            type: 'GET',
            url: '/server/client.php', // has to be changed
            // url: 'json/musicHiveInfo.json', // has to be changed
            data: { 
                type: 'getInfo'
            }
        }).done(function(data) {
            if(String(data).substring(0,5) === 'error'){
                $('#bug-logger').append('done - error: ' + data + '<br/>');
            } else{
                that.renderData(data);
            }
        }).fail(function(error){
                $('#bug-logger').append('fail - error: i´m sorry, something went wrong (get currently playing data)<br/>');
        });

    },

    downvoteSend: function(trackId){
        var that = this;
        $.ajax({
            type: 'POST',
            url: '/server/client.php', // has to be changed
            // url: 'upload.php', // has to be changed
            data: { 
                type: 'downvoteTrack',
                trackId: trackId
            }
        }).done(function(data) {
            if(data.substring(0,5) === 'error'){
                $('#bug-logger').append('done - error: ' + data + '<br/>');
            } else{
                that.downvote.addClass('disabled');
            }
        }).fail(function(error){
            $('#bug-logger').append('fail - error: i´m sorry, something went wrong (send currently playing data downvote)<br/>');
        });
    },

    renderData: function(data){

        this.currentTrackId = data.musicHiveInfo.currentlyPlaying.t_id;

        // check if current playing song already shown
        if(this.currentTrackId === this.oldCurrentTrackId){
            return true;
        }

        if(data.musicHiveInfo.status.internet_access == 'true'){
            this.internetAccess.text('Yes');
        } else {
            this.internetAccess.text('No');
        }
        this.infoUsers.text(data.musicHiveInfo.status.users);

		if(data.musicHiveInfo.currentlyPlaying == false) {
            this.downvote.addClass('hide');
            this.trackText.text('No song available');
            this.artistText.text('');
            this.albumText.text('');
            this.durationText.text('');
            this.userImage.css('background-image', 'url(img/user-image.jpg)');
            return true;
        } else {
            this.downvote.removeClass('hide');
        }

        this.trackText.text(data.musicHiveInfo.currentlyPlaying.t_title);
        this.artistText.text(data.musicHiveInfo.currentlyPlaying.t_artist);
        this.albumText.text(data.musicHiveInfo.currentlyPlaying.t_album);

        var time = data.musicHiveInfo.currentlyPlaying.t_length;
        var minutes = Math.floor(time / 60);
        var seconds = time - minutes * 60;
        if(minutes > 0){
            time = minutes + ' Min. ';
        } 
        if(seconds > 0){
            time += seconds + ' Sek.';
        }

        this.durationText.text(time);

        // if user has already voted track down
        if(data.musicHiveInfo.currentlyPlaying.downvote !== 0){
            this.downvote.addClass('disabled');
        } else {
            this.downvote.removeClass('disabled');
        }

        if(data.musicHiveInfo.currentlyPlaying.u_picture.length > 0){
        	this.userImage.css('background-image', 'url(' + '/server/userdata/' + data.musicHiveInfo.currentlyPlaying.u_picture + ')');
        } else {
            this.userImage.css('background-image', 'url(img/user-image.jpg)');
        }

        this.oldCurrentTrackId = this.currentTrackId;

    },

    pollingInterval: function(){
        var that = this;
        setInterval(function(){
            that.getCurrentlyPlayingData();
        }, that.pollingIntervalValue);

    },

    playlistUpdateInterval: function(){
        var that = this;
        setInterval(function(){
            if(that.currentTrackId !== that.oldTrackId){
                playList.getPlaylist();
                that.oldTrackId = that.currentTrackId;
            }
        }, that.playlistUpdateIntervalValue);
    }

};


var uploader = {

    allowedFileTypes: ['audio/mpeg', 'audio/x-mpeg', 'audio/x-mpeg-3', 'audio/mp3', 'audio/mp4', 'audio/ogg', 'audio/opus', 'audio/vorbis', 'audio/vnd.wav', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/aiff', 'audio/x-aiff'],
    filename: '',

    init: function(){
        this.setEventlistener();
    },
    
    setEventlistener: function(){
        var that = this;

        $('#all-entries').on('click','.musichive-upload-entry.musichive-upload-only-first .musichive-upload-song-icon', function(e){
            var clickedElement = $(this);
            clickedElement.siblings('input.musichive-input-file-upload').trigger('click');
        });

        $('#all-entries').on('change', 'input.musichive-input-file-upload', function(e){
            e.preventDefault();
            var inputElement = $(this);
            that.filename = inputElement.val().split('\\').pop();

            if(that.checkFile(inputElement)){
                $(this).siblings('.musichive-inline-table').find('.musichive-playlist-entry-title-text').text(that.filename);
                $(this).siblings('.musichive-upload-song-icon').addClass('hide');
                $(this).siblings('.musichive-upload-song-start, .musichive-upload-song-abort').removeClass('hide');
            }

        });

        $('#all-entries').on('click', '.musichive-upload-song-start', function(){
            var inputElement = $(this).siblings('.musichive-input-file-upload');
            var progressBar = $(this).siblings('.musichive-upload-song-progress');
            that.readFile(inputElement[0].files[0], progressBar);

            $(this).siblings('.musichive-upload-song-abort').addClass('hide');
            $(this).addClass('hide');
            progressBar.removeClass('hide');
        });

        $('#all-entries').on('click', '.musichive-upload-song-abort',function(){
            var inputElement = $(this).siblings('.musichive-input-file-upload');
            $(this).siblings('.musichive-upload-song-icon').removeClass('hide');
            $(this).siblings('.musichive-upload-song-start').addClass('hide');
            $(this).addClass('hide');
            inputElement.siblings('.musichive-inline-table').find('.musichive-playlist-entry-title-text').text('...');

            // clear input field it´s not enough
            // better --> remove and add input field again
            var wrapper = $(this).parents('.musichive-playlist-draggable');
            inputElement.remove();
            wrapper.append('<input type="file" class="musichive-input-file-upload" />');
        });

    },

    checkFile: function(givenFile){
        if(this.checkHtml5Api()){
            var fileSize = givenFile[0].files[0].size;
            var fileType = givenFile[0].files[0].type;

            // check if file type is allowed
            if($.inArray(fileType, this.allowedFileTypes) >= 0 || fileType.length == 0){
                return true;
            } else {
                alert('file type not supported: ' + fileType);
                return false;
            }
        } else {
            alert('no file api exists');
            return false;
        }

    },

    readFile: function(givenFile, progressBar){
        var that = this;
        var fileReader = new FileReader();
        fileReader.onload = function(){
            that.uploadFile(fileReader.result, givenFile, progressBar);
        };
        fileReader.readAsDataURL(givenFile);
    },

    uploadFile: function(fileData, givenFile, progressBar){
        // console.log(fileData);
        var that = this;
        var progressBarText = progressBar.find('span');
        var formData = new FormData();
        var client = new XMLHttpRequest();
        
        /*formData.append('file', fileData);
        formData.append('filename', that.filename);*/
        formData.append('type', 'uploadTrack');
		formData.append('file', givenFile);


        client.onerror = function(e) {
            alert('error, please try again (upload track went wrong)');
        };

        client.onload = function(e) {
            $('#bug-logger').append('done - response song upload: ' + e.target.responseText + '<br/> ');
            progressBarText.text('100%');
            progressBar.addClass('hide');
            progressBar.siblings('.musichive-song-remove').removeClass('hide');
            progressBar.siblings('.musichive-song-move-up').removeClass('hide');
            progressBar.siblings('.musichive-song-move-down').removeClass('hide');
            progressBar.parents('.musichive-playlist-entry-container').removeClass('musichive-upload-entry').addClass('musichive-editable-entry');
            
            // refresh playlist, currently playing data
            playList.getPlaylist();
            currentlyPlaying.getCurrentlyPlayingData();
        };

        client.upload.onprogress = function(e) {
            var p = Math.round(100 / e.total * e.loaded);
            progressBarText.text(p + '%');
        };

        client.open('POST', '/server/client.php');
        // client.open('POST', 'upload.php');
        client.send(formData);

    },

    checkHtml5Api: function(){
        return (window.File && window.FileReader && window.FileList && window.Blob);
    }
};


var userImage = {

    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif'],
    filename: '',

    init: function(){
        this.getUserImageData();
        this.setEventlistener();
    },
    
    setEventlistener: function(){
        var that = this;

        $('#musichive-user-settings-image-upload').on('click','#musichive-select-user-image', function(e){
            var clickedElement = $(this);
            clickedElement.siblings('input#musichive-upload-user-image-file').trigger('click');
        });

        $('#musichive-user-settings-image-upload').on('change', 'input#musichive-upload-user-image-file', function(e){
            e.preventDefault();
            var inputElement = $(this);
            that.filename = inputElement.val().split('\\').pop();

            if(that.checkFile(inputElement)){
                $('#musichive-user-image-upload-file-text-wrapper').removeClass('hide');
                $('#musichive-user-image-upload-file-text').text(that.filename);
                $('#musichive-select-user-image').addClass('hide');
                $('#musichive-user-image-confirm').removeClass('hide');
            }

        });

        $('#musichive-user-settings-image-upload').on('click', '#musichive-user-image-upload-start', function(){
            var inputElement = $('#musichive-upload-user-image-file');
            var progressBar = $('#musichive-user-image-upload-file-text');
            that.readFile(inputElement[0].files[0], progressBar);

            $('#musichive-user-image-upload-start').addClass('hide');
            $('#musichive-user-image-upload-cancel').addClass('hide');
        });

        $('#musichive-user-settings-image-upload').on('click', '#musichive-user-image-upload-cancel',function(){
            $('#musichive-select-user-image').removeClass('hide');
            $('#musichive-user-image-confirm').addClass('hide');

            // clear input field it´s not enough
            // better --> remove and add input field again
            $('#musichive-upload-user-image-file').remove();
            $('#musichive-user-settings-image-upload').append('<input type="file" id="musichive-upload-user-image-file" />');
        });

    },

    checkFile: function(givenFile){
        if(this.checkHtml5Api()){
            var fileSize = givenFile[0].files[0].size;
            var fileType = givenFile[0].files[0].type;

            // check if file type is allowed
            if($.inArray(fileType, this.allowedFileTypes) >= 0){
                return true;
            } else {
                alert('file type not supported.');
                return false;
            }
        } else {
            alert('no file api exists');
            return false;
        }

    },

    readFile: function(givenFile, progressBar){
        var that = this;
        var fileReader = new FileReader();
        fileReader.onload = function(){
            that.uploadFile(fileReader.result, givenFile, progressBar);
        };
        fileReader.readAsDataURL(givenFile);
    },

    uploadFile: function(fileData, givenFile, progressBar){
        // console.log(fileData);
        var that = this;
        var formData = new FormData();
        var client = new XMLHttpRequest();

        /*formData.append('file', fileData);
        formData.append('filename', that.filename);*/
		formData.append('type', 'uploadUserImage');
		formData.append('file', givenFile);

        client.onerror = function(e) {
            alert('error, please try again (upload user image went wrong)');
        };

        client.onload = function(e) {
            console.log(e.target.responseText);
            progressBar.text('100%');
            $('#musichive-user-settings-image').css({'background': 'url(' + fileData + ')', 'background-size': 'cover'});
            $('#musichive-user-image-upload-file-text-wrapper').addClass('hide');
            $('#musichive-select-user-image').removeClass('hide');
            $('#musichive-user-image-confirm').addClass('hide')
            $('#musichive-user-image-upload-start').removeClass('hide');
            $('#musichive-user-image-upload-cancel').removeClass('hide');

            setTimeout(function(){
                that.getUserImageData();
            }, 3000);
        };

        client.upload.onprogress = function(e) {
            var p = Math.round(100 / e.total * e.loaded);
            progressBar.text(p + '%');
        };

        client.open('POST', '/server/client.php');
        // client.open('POST', 'upload.php');
        client.send(formData);

    },

    checkHtml5Api: function(){
        return (window.File && window.FileReader && window.FileList && window.Blob);
    },

    renderData: function(data){
        $('#musichive-user-settings-image').css({'background': 'url(' + '/server/userdata/' + data.musicHiveUserImage.url + ')', 'background-size': 'cover'});
    },

    getUserImageData: function(){
        var that = this;
        $.ajax({
            type: 'GET',
            url: '/server/client.php', // has to be changed
            // url: 'json/musicHiveUserImage.json', // has to be changed
            data: { 
                type: 'getUserImage'
            }
        }).done(function(data) {
            if(String(data).substring(0,5) === 'error'){
                $('#bug-logger').append('done - error: ' + data + '<br/>');
            } else{
                that.renderData(data);
            }
        }).fail(function(error){
            $('#bug-logger').append('fail - error: i´m sorry, something went wrong (get user image)<br/>');
        });
    },

};


var playList = {

    allEntriesWrapper: $('#all-entries'),
    entryTemplate: $('#entry-markup'),

    init: function(){

        this.getPlaylist();
        this.setEventlistener();
    },

    setEventlistener: function(){
        var that = this;

        // remove song
    	$('#all-entries').on('click', '.musichive-song-remove', function() {
            that.removeSong(this);
        });

        // song move up
        $('#all-entries').on('click', '.musichive-song-move-up', function() {
            that.moveTrackUp(this);
        });

        // song move up
        $('#all-entries').on('click', '.musichive-song-move-down', function() {
            that.moveTrackDown(this);
        });
    },

    getPlaylist: function(){
        // ajax request
        var that = this;
        $.ajax({
            type: 'GET',
            url: '/server/client.php', // has to be changed
            // url: 'json/musicHivePlaylist.json', // has to be changed
            data: { 
                type: 'getPlaylist'
            }
        }).done(function(data) {
            if(String(data).substring(0,5) === 'error'){
                $('#bug-logger').append('done - error: ' + data + '<br/>');
            } else{
                that.allEntriesWrapper.find('.musichive-playlist-entry-container').remove();
                that.renderPlaylist(data);
            }
        }).fail(function(error){
            $('#bug-logger').append('fail - error: i´m sorry, something went wrong (get playlist data)<br/>');
        });
    },

    renderPlaylist: function(data){
        var runner = 1;
        
        if ($.isEmptyObject(data)) {
            for (var i=1; i<6; i++) {
                $("#entry-upload-markup").tmpl({runnerId: i}).appendTo("#all-entries");
            }
        } else {
            var i = 1;
            $.each(data.musicHivePlaylist, function(key, value) {
                i++;

                $("#entry-markup").tmpl({runnerId: runner++, title: value.t_title, trackId: value.t_id}).appendTo("#all-entries");
            });

            for (i; i<6; i++) {
                $("#entry-upload-markup").tmpl({runnerId: i}).appendTo("#all-entries");
            }

        }
        // after render care
        this.afterRenderCare();
    },

    removeSong: function(clickedElement){
        var that = this;
        var song = $(clickedElement).parents('.musichive-playlist-entry-container');
        var trackId = song.attr('data-trackid');

        // check if currently playing track id is the same like the remove track id 
        if(trackId == currentlyPlaying.currentTrackId){
            if(!window.confirm("Dieses Lied wird gerade abgespielt. Möchtest du es tatsächlich löschen?")){
                return false;
            }
        }

        song.remove();

        $("#entry-upload-markup").tmpl({runnerId: 0}).appendTo("#all-entries");
        
        var getAllEntries = $('.musichive-playlist-entry-container').find('.musichive-playlist-entry-number');

        var i = 1;
        $.each(getAllEntries, function(key, value) {
            $(value).text(i++ + '.');
        });

        // after render care
        this.afterRenderCare();

        $.ajax({
            type: 'POST',
            url: '/server/client.php', // has to be changed
            // url: 'upload.php', // has to be changed
            data: { 
                type: 'removeTrack',
                trackId: trackId
            }
        }).done(function(data) {
            if(data.substring(0,5) === 'error'){
                $('#bug-logger').append('done - error: ' + data + '<br/>');
            } else{
                // refresh playlist, currently playing data
                that.getPlaylist();
                currentlyPlaying.getCurrentlyPlayingData();
            }
        }).fail(function(error){
            $('#bug-logger').append('fail - error: i´m sorry, something went wrong (remove track)<br/>');
        });
    },

    moveTrackUp: function(clickedElement){
           this.swapTrack(clickedElement, 'up');
    },

    moveTrackDown: function(clickedElement){
            this.swapTrack(clickedElement, 'down');
    },

    swapTrack: function(clickedElement, type){
            var that = this;
            var trackTwo = '';
            var trackOne = '';


            trackOne = $(clickedElement).parents('.musichive-playlist-entry-container');

            if(type === 'up'){
                trackTwo = $(clickedElement).parents('.musichive-playlist-entry-container').prev();
            } else {
                trackTwo = $(clickedElement).parents('.musichive-playlist-entry-container').next(); 
            }

            var trackIdOne = trackOne.attr('data-trackid');
            var trackIdTwo = trackTwo.attr('data-trackid');
            
            console.log(trackIdOne);
            console.log(trackIdTwo);

            if(type === 'up'){
                trackTwo.remove();
                $(trackOne).after(trackTwo);
            } else {
                trackTwo.remove();
                $(trackOne).before(trackTwo);

            }

            // Durchnummieren
            var getAllEntries = $('.musichive-playlist-entry-container').find('.musichive-playlist-entry-number');
            var i = 1;
            $.each(getAllEntries, function(key, value) {
                $(value).text(i++ + '.');
            });

            // after render care
            this.afterRenderCare();

            $.ajax({
                type: 'POST',
                url: '/server/client.php', // has to be changed
                // url: 'upload.php', // has to be changed
                data: { 
                    type: 'swapTrack',
                    trackIds: [
                        trackIdOne,
                        trackIdTwo
                    ]
                }
            }).done(function(data) {
                if(String(data).substring(0,5) === 'error'){
                    $('#bug-logger').append('done - error: ' + data + '<br/>');
                } else{
                    // refresh playlist, currently playing data
                    that.getPlaylist();
                    currentlyPlaying.getCurrentlyPlayingData();
                }
            }).fail(function(error){
                $('#bug-logger').append('fail - error: i´m sorry, something went wrong (swap track data)<br/>');
            });

    },

    afterRenderCare: function(){
        var editableEntry = $('.musichive-editable-entry');
        var up = editableEntry.find('.musichive-song-move-up');
        var down = editableEntry.find('.musichive-song-move-down');
        up.removeClass('hide');
        down.removeClass('hide');
        up.first().addClass('hide');
        down.last().addClass('hide');

        $('#bug-logger').append($('.musichive-playlist-entry-container').first().attr('data-trackid') + ' -- ' + currentlyPlaying.currentTrackId + '<br/>');

        if($('.musichive-playlist-entry-container').first().attr('data-trackid') == currentlyPlaying.currentTrackId){
            down.first().addClass('hide');
            editableEntry.find('.musichive-song-move-up:eq(1)').addClass('hide');
        }

        $('.musichive-upload-entry').first().addClass('musichive-upload-only-first');
    }
};

function toggleBackground() {
    if($(window).width() < 1500) {
        $('#musichive-background').removeClass('musichive-hex');
        $('body').removeClass('musichive-bg');
    } else {
        $('#musichive-background').addClass('musichive-hex');
        $('body').addClass('musichive-bg');
    }
}

function scrollInfoText() {
    
    // scroll text if it is too long
    
    if ($('#musichive-player-trackid').width() < $('#musichive-player-trackid-text').width()) {
        $('#musichive-player-trackid').addClass('marquee');
    } else {
        $('#musichive-player-trackid').removeClass('marquee');
    }
    
    if ($('#musichive-player-artist').width() < $('#musichive-player-artist-text').width()) {
        $('#musichive-player-artist').addClass('marquee');
    } else {
        $('#musichive-player-artist').removeClass('marquee');
    }
    
    if ($('#musichive-player-album').width() < $('#musichive-player-album-text').width()) {
        $('#musichive-player-album').addClass('marquee');
    } else {
        $('#musichive-player-album').removeClass('marquee');
    }
}
