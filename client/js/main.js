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
    
    $('#musichive-playlist-input-submit').click(function() {
        var title = $('.fileinput-filename').html();
        addNewPlaylistEntry(title);
        $('.fileinput').fileinput('clear');
    });
    
    // $('#musichive-show-user').click(function() {
    //     $(this).toggleClass('hide');
    //     $('#musichive-user-image-container').toggleClass('hide');
    //     $('#musichive-player-heading-dj').toggleClass('hide');
    // });
    
    // $('#musichive-user-image-container').click(function() {
    //     $(this).toggleClass('hide');
    //     $('#musichive-show-user').toggleClass('hide');
    //     $('#musichive-player-heading-dj').toggleClass('hide');
    // });
    
    $('#musichive-user-image-upload').click(function() {
        $('#musichive-nav-tabs-settings a').tab('show');
    });

    currentlyPlaying.init();

    uploader.init();

    // Add a media query change listener
    watchDeviceOrientation = window.matchMedia("(orientation: portrait)");
    
    watchDeviceOrientation.addListener(function(m) {
        // window.location.reload();
    });
    
    window.onresize = function(event) {
        toggleBackground();
        scrollInfoText();
        checkPlaylistEntries();
    }
    
    toggleBackground();
    scrollInfoText();
    checkPlaylistEntries();
});


var currentlyPlaying = {

    pollingIntervalValue: 5000,
    currentTrackId: 0,

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

        this.getData();
        this.pollingInterval();
        this.setEventlistener();

    },

    setEventlistener: function(){
        var that = this;
        $('#musichive-downvote').on('click', function(){
            that.sendDataDownvote(that.currentTrackId);
        });
    },

    getData: function(){
        var that = this;

        $.ajax({
            type: 'GET',
            url: 'json/musicHiveInfo.json', // has to be changed
        }).done(function(data) {
            that.renderData(data);
        }).fail(function(error){
            alert('i´m sorry, something went wrong (get currently playing data)');
        });

    },

    sendDataDownvote: function(trackId){

        $.ajax({
            type: 'POST',
            url: 'upload.php', // has to be changed
            data: { 
                type: 'downvote',
                trackId: trackId
            }
        }).done(function(data) {
            console.log('success downvote');
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
        this.durationText.text(data.musicHiveInfo.currentlyPlaying.t_length);

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
            that.getData();
            console.log('polling currently playing');
        }, that.pollingIntervalValue);

    }

};


var uploader = {
    allowedFileTypes: ['audio/mp3', 'audio/mpeg'],

    init: function(){
        this.setEventlistener();
    },
    
    setEventlistener: function(){
        var that = this;

        $('.musichive-upload-song-icon').on('click', function(e){
            var clickedElement = $(this);
            clickedElement.siblings('input.musichive-input-file-upload').trigger('click');
        });

        $('.musichive-playlist-entry-container').on('change', 'input.musichive-input-file-upload', function(e){
            e.preventDefault();
            var inputElement = $(this);
            var filename = inputElement.val().split('\\').pop();

            if(that.checkFile(inputElement)){
                $(this).siblings('.musichive-inline-table').find('.musichive-playlist-entry-title-text').text(filename);
                $(this).siblings('.musichive-upload-song-icon').addClass('hide');
                $(this).siblings('.musichive-upload-song-start, .musichive-upload-song-abort').removeClass('hide');
            }

        });

        $('.musichive-upload-song-start').on('click', function(){
            var inputElement = $(this).siblings('.musichive-input-file-upload');
            var progressBar = $(this).siblings('.musichive-upload-song-progress');
            that.readFile(inputElement[0].files[0], progressBar);

            $(this).siblings('.musichive-upload-song-abort').addClass('hide');
            $(this).addClass('hide');
            progressBar.removeClass('hide');
        });

        $('.musichive-upload-song-abort').on('click', function(){
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
        console.log(fileData);
        var progressBarText = progressBar.find('span');
        var formData = new FormData();
        var client = new XMLHttpRequest();
        
        formData.append('file', fileData);


        client.onerror = function(e) {
            alert('error, please try again');
        };

        client.onload = function(e) {
            console.log(e.target.responseText);
            progressBarText.text('100%');
            progressBar.addClass('hide');
            progressBar.siblings('.musichive-song-remove').removeClass('hide');
            progressBar.siblings('.musichive-song-move-up').removeClass('hide');
            progressBar.siblings('.musichive-song-move-down').removeClass('hide');
        };

        client.upload.onprogress = function(e) {
            var p = Math.round(100 / e.total * e.loaded);
            progressBarText.text(p + '%');
        };

        client.open('POST', 'upload.php');
        client.send(formData);

    },

    checkHtml5Api: function(){
        return (window.File && window.FileReader && window.FileList && window.Blob);
    }
};


function deleteTrack(element) {
    
    function deleteListElement() {
        $('#'+elementContainer).addClass('musichive-hide');
        setTimeout("$('#"+elementContainer+"').remove()", 300);
        setTimeout("checkPlaylistEntries();", 300);
    }
    if ($('#'+elementContainer).hasClass('musichive-playing')) {
        if (confirm('This track is currently playing! Are you sure you want to delete it? This will stop the playback.')) {
            deleteListElement();
        } else {
            // Do nothing!
        }
    } else {
        deleteListElement();
    }
    return false;
}

function addNewPlaylistEntry(title) {
    $.get('view-playlist-entry.html', function(data) {
        $('#musichive-playlist-entrypoint').append(data);
        document.getElementById('musichive-new-dragentity').addEventListener('dragstart', function (e) {
            // get container element
            var elementContainer = $(this).parent().attr('id');
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/html', elementContainer);
        }, false);
        $('#musichive-new-title').html(title);
        $('#musichive-new-title').attr('id', '');
        $('#musichive-new-dragentity').attr('id', '');
        $('#musichive-playlist-entry-99').removeClass('musichive-hide');
        checkPlaylistEntries();
    });
}

function toggleBackground() {
    if($(window).width() < 1500) {
        $('#musichive-background').removeClass('musichive-hex');
        $('body').removeClass('musichive-bg');
    } else {
        $('#musichive-background').addClass('musichive-hex');
        $('body').addClass('musichive-bg');
    }
}

function checkPlaylistEntries() {
    
    // --- check if text scrolling is necessary ---
    $('.musichive-playlist-entry-title').each(function() {
        // console.log($(this).width() + ' vs ' + $(this).children([0]).width());
        if ($(this).width() < $(this).children(':first').width()) {
            $(this).addClass('marquee');
        } else {
            $(this).removeClass('marquee');
        }
    });    
    
    // --- count playlist items and trigger text change ---
    var counter = 0;
    $('.musichive-playlist-entry-container').each(function() {
        counter++;
        if ($(this).attr('id') != 'musichive-playlist-entry-'+counter) {
            console.log($(this).attr('id'));
            $(this).children(':first').html(counter+'.');
        }
    });
    
    if (counter == 5) {
        $('#musichive-playlist-add-header').html('<p><strong>Your playlist is currently full :-) Happy listening!</strong></p>');
        $('#musichive-playlist-input-form').addClass('hide');
    } else {
        $('#musichive-playlist-add-header').html('<p><strong>You can add <span id="musichive-playlist-addno"></span>:</strong></p>');
        $('#musichive-playlist-input-form').removeClass('hide');
    }
    
    if (counter == 4) {
        $('#musichive-playlist-addno').html('one more track');
    }
    
    if (counter == 3) {
        $('#musichive-playlist-addno').html('two more tracks');
    }
    
    if (counter == 2) {
        $('#musichive-playlist-addno').html('three more tracks');
    }
    
    if (counter == 1) {
        $('#musichive-playlist-addno').html('four more tracks');
    }
    
    if (counter == 0) {
        $('#musichive-playlist-addno').html('five more tracks');
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


function dragPlaylistEntry(event) {
    console.log(event);
}