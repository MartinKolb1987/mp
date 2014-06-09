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

    pollingIntervalValue: 5000,
    playlistUpdateIntervalValue: 1000,
    currentTrackId: 0,
    oldTrackId: 0,

    internetAccess: '',
    infoUsers: '',
    trackText: '',
    artistText: '',
    albumText: '',
    durationText: '',
    userImage: '',

    init: function(){
        this.internetAccess = $('#musichive-info-internet');
        this.infoUsers = $('#musichive-info-users');
        this.trackText = $('#musichive-player-trackid-text');
        this.artistText = $('#musichive-player-artist-text');
        this.albumText = $('#musichive-player-album-text');
        this.durationText = $('#musichive-player-duration-text');
        this.userImage = $('#musichive-user-image');

        this.getCurrentlyPlayingData();
        this.pollingInterval();
        this.playlistUpdateInterval();
        this.setEventlistener();
    },

    setEventlistener: function(){
        var that = this;
        $('#musichive-downvote').on('click', function(){
            if(!$(this).hasClass('disabled')){
                that.downvote(that.currentTrackId);
            }
        });
    },

    getCurrentlyPlayingData: function(){
        var that = this;

        $.ajax({
            type: 'GET',
            url: '../server/client.php', // has to be changed
            // url: 'json/musicHiveInfo.json', // has to be changed
            data: { 
                type: 'getInfo'
            }
        }).done(function(data) {
            if(data.substring(0,5) === 'error'){
                alert(data);
            } else{
                that.renderData(data);
            }
        }).fail(function(error){
            alert('i´m sorry, something went wrong (get currently playing data)');
        });

    },

    downvote: function(trackId){
        $.ajax({
            type: 'POST',
            url: '../server/client.php', // has to be changed
            // url: 'upload.php', // has to be changed
            data: { 
                type: 'downvoteTrack',
                trackId: trackId
            }
        }).done(function(data) {
            if(data.substring(0,5) === 'error'){
                alert(data);
            } else{
                $('#musichive-downvote').addClass('disabled');
            }
        }).fail(function(error){
            alert('i´m sorry, something went wrong (send currently playing data downvote)');
        });
    },

    renderData: function(data){
        if(data.musicHiveInfo.status.internet_access){
            this.internetAccess.text('Ja');
        } else {
            this.internetAccess.text('Nein');
        }

        this.infoUsers.text(data.musicHiveInfo.status.users);
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
            $('#musichive-downvote').addClass('disabled');
        }

        if(data.musicHiveInfo.currentlyPlaying.u_picture.length > 0){
            this.userImage.css('background-image', 'url(' + data.musicHiveInfo.currentlyPlaying.u_picture + ')');
        } else {
            this.userImage.css('background-image', 'url(img/user-image.jpg)');
        }

        this.currentTrackId  = data.musicHiveInfo.currentlyPlaying.t_id;
    },

    pollingInterval: function(){
        var that = this;
        setInterval(function(){
            that.getCurrentlyPlayingData();
            console.log('polling currently playing');
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

    allowedFileTypes: ['audio/mp3', 'audio/mpeg'],
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
            that.uploadFile(fileReader.result, progressBar);
        };
        fileReader.readAsDataURL(givenFile);
    },

    uploadFile: function(fileData, progressBar){
        // console.log(fileData);
        var that = this;
        var progressBarText = progressBar.find('span');
        var formData = new FormData();
        var client = new XMLHttpRequest();
        
        formData.append('type', 'uploadTrack');
        formData.append('file', fileData);
        formData.append('filename', that.filename);


        client.onerror = function(e) {
            alert('error, please try again (upload track went wrong)');
        };

        client.onload = function(e) {
            console.log(e.target.responseText);
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

        client.open('POST', '../server/client.php');
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
            that.uploadFile(fileReader.result, progressBar);
        };
        fileReader.readAsDataURL(givenFile);
    },

    uploadFile: function(fileData, progressBar){
        // console.log(fileData);
        var that = this;
        var formData = new FormData();
        var client = new XMLHttpRequest();

        formData.append('type', 'uploadUserImage');
        formData.append('userImageFile', fileData);
        formData.append('userImageFilename', that.filename);


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

        client.open('POST', '../server/client.php');
        // client.open('POST', 'upload.php');
        client.send(formData);

    },

    checkHtml5Api: function(){
        return (window.File && window.FileReader && window.FileList && window.Blob);
    },

    renderData: function(data){
        $('#musichive-user-settings-image').css({'background': 'url(' + data.musicHiveUserImage.url + ')', 'background-size': 'cover'});
    },

    getUserImageData: function(){
        var that = this;
        $.ajax({
            type: 'GET',
            url: '../server/client.php', // has to be changed
            // url: 'json/musicHiveUserImage.json', // has to be changed
            data: { 
                type: 'getUserImage'
            }
        }).done(function(data) {
            if(data.substring(0,5) === 'error'){
                alert(data);
            } else{
                that.renderData(data);
            }
        }).fail(function(error){
            alert('i´m sorry, something went wrong (get user image)');
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
            url: '../server/client.php', // has to be changed
            // url: 'json/musicHivePlaylist.json', // has to be changed
            data: { 
                type: 'getPlaylist'
            }
        }).done(function(data) {
            if(data.substring(0,5) === 'error'){
                alert(data);
            } else{
                that.allEntriesWrapper.find('.musichive-playlist-entry-container').remove();
                that.renderPlaylist(data);
            }
        }).fail(function(error){
            alert('i´m sorry, something went wrong (get playlist data)');
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
            url: '../server/client.php', // has to be changed
            // url: 'upload.php', // has to be changed
            data: { 
                type: 'removeTrack',
                trackId: trackId
            }
        }).done(function(data) {
            if(data.substring(0,5) === 'error'){
                alert(data);
            } else{
                // refresh playlist, currently playing data
                that.getPlaylist();
                currentlyPlaying.getCurrentlyPlayingData();
            }
        }).fail(function(error){
            alert('i´m sorry, something went wrong (remove track)');
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
                url: '../server/client.php', // has to be changed
                // url: 'upload.php', // has to be changed
                data: { 
                    type: 'swapTrack',
                    trackIds: [
                        trackIdOne,
                        trackIdTwo
                    ]
                }
            }).done(function(data) {
                if(data.substring(0,5) === 'error'){
                    alert(data);
                } else{
                    // refresh playlist, currently playing data
                    that.getPlaylist();
                    currentlyPlaying.getCurrentlyPlayingData();
                }
            }).fail(function(error){
                alert('i´m sorry, something went wrong (swap track data)');
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