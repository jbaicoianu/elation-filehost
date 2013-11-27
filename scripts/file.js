elation.component.add("filehost.file", function() {
  this.init = function() {
    this.dirname = this.args.dirname || 'uploads';

    this.file = this.args.file;
    this.filename = this.args.filename || this.file.name;
    this.urls = this.args.urls || {};

    this.filetype = this.args.filetype || false;
    this.filesize = +this.args.filesize || 0; // force to int
    this.permissions = this.args.permissions || 0;
    this.status = this.args.status || 0;
    this.metadata = this.args.metadata || {};
    this.created_time = this.args.created_time || new Date().getTime();
    this.modified_time = this.args.modified_time || new Date().getTime();

    var dotpos = this.filename.lastIndexOf('.');
    this.title = this.args.title || this.filename.substr(0, dotpos);
    this.extension = this.filename.substr(dotpos+1).toLowerCase();
    this.description = this.args.description || '';
    //console.log('filename', this.filename, this.extension, dotpos, this.title);

    if (this.file) {
      this.img = this.loadFromFile(this.file);
    } else if (this.urls) {
      this.img = this.loadFromURL(this.urls.thumb);
    }
    this.previewsize = [256, 192];

    this.create();
    elation.html.addclass(this.container, 'filehost_file');
  }
  this.create = function() {
    var mainpanel = elation.ui.panel(null, elation.html.create({append: this.container}), {orientation: 'horizontal'});
    var infopanel = elation.ui.panel(null, elation.html.create({append: this.container}), {orientation: 'vertical', classname: 'filehost_file_info'});
    var previewpanel = elation.ui.panel(null, elation.html.create({append: this.container}), {orientation: 'vertical', classname: 'filehost_file_preview'});

    this.progressbar = elation.ui.progressbar(null, elation.html.create(), {value: 0, hidden: true});

    previewpanel.add(elation.ui.spinner(null, elation.html.create(), {}));
    previewpanel.add(this.progressbar);

    this.filenamelabel = infopanel.add(elation.ui.label(null, elation.html.create('h2'), {label: this.title, classname: 'filehost_type_' + this.extension, editable: true}));
    infopanel.add(elation.filehost.file_metadata(null, elation.html.create(), {file: this}));
    infopanel.add(elation.filehost.file_actions(null, elation.html.create(), {file: this}));

    mainpanel.add(previewpanel);
    mainpanel.add(infopanel);

    this.panels = {
      main: mainpanel,
      preview: previewpanel,
      info: infopanel,
    };

    elation.events.add(this.filenamelabel, 'ui_label_change', elation.bind(this, function(ev) { this.rename(this.dirname, ev.data + '.' + this.extension); }));
  }
  this.calculateChecksum = function(callback) {
    // TODO - cache results
    if (this.file) {
      var reader = new FileReader();
      reader.onloadend = elation.bind(this, function() {
        var filemd5 = md5(reader.result, reader.result.length);
        if (callback) callback(filemd5);
      });
      reader.readAsBinaryString(this.file);
    }
  }
  this.loadFromFile = function() {
    var img = document.createElement('img');
    if (this.file) {
      this.filesize = this.file.size;
      var reader = new FileReader();
      reader.onloadend = elation.bind(this, function() {
        img.src = reader.result;
        this.generatePreview();
      });
      reader.readAsDataURL(this.file);
    }
    return img;
  }
  this.loadFromURL = function(url) {
    var img = document.createElement('img');
    img.src = url;
    this.preview = img;
    img.onload = elation.bind(this, function() {
      this.updatePreview();
    });
    return img;
  }
  this.generatePreview = function() {
    if (this.img && this.img.width == this.previewsize[0] && this.img.height == this.previewsize[1]) {
      this.preview = this.img;
      this.updatePreview();
    } else {
      this.preview = this.getResizedImage(this.previewsize, elation.bind(this, this.updatePreview));
    }
  }
  this.updatePreview = function(buffer) {
    var loading = elation.find(".loading-container", this.container)[0];
    if (this.preview && loading) {
      loading.parentNode.replaceChild(this.preview, loading);
    }
  }
  this.getImageData = function() {
    var canvas = document.createElement('canvas');
    canvas.width = this.img.width;
    canvas.height = this.img.height;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(this.img, 0, 0);
    return ctx.getImageData(0, 0, this.img.width, this.img.height);
  }
  this.getResizedImage = function(size, callback) {
    var realsize = [this.img.width, this.img.height];
    if (!size) size = realsize;
    var ratio = Math.min(size[0] / realsize[0], size[1] / realsize[1]);
    // Make sure we round to even numbers, or the resize algorithm goes funny
    var newsize = [Math.round(ratio * realsize[0] / 2) * 2, Math.round(ratio * realsize[1] / 2) * 2];

    var canvas = document.createElement('CANVAS');
    canvas.width = newsize[0];
    canvas.height = newsize[1];
    var ctx = canvas.getContext('2d');
    var resizer = new Resize(realsize[0], realsize[1], newsize[0], newsize[1], true, true, true, elation.bind(this, function(buffer) {
      var imgdata = ctx.createImageData(newsize[0], newsize[1]);
      var length = imgdata.data.length;
      for (var x = 0; x < length; ++x) {
        imgdata.data[x] = buffer[x] & 0xFF;
      }
      ctx.putImageData(imgdata, 0, 0);
      console.log('resized', this.preview);
      if (callback) callback();
    }));
    var imagedata = this.getImageData();
    resizer.resize(imagedata.data);
    return canvas;
  } 
  this.upload = function() {
    // First, we check with the server to see if this image already exists
    // If file exists, we compute the checksum of our local file, and compare it with what the server has
    // If file checksum matches, the files are the same and we skip to "complete"
    // Else if checksum differs, the user is prompted whether to overwrite or rename
    // If the file did not exist, or the user selects to overrwrite or upload with a new name, perform upload

    this.progressbar.show(0, "checking...");
    this.upload_check();
  }
  this.upload_check = function() {
    var checkdata = {
      dirname: this.dirname,
      filename: this.file.name,
      create: true
    };
    elation.net.get('/filehost/check.js?', checkdata, {
      callback: elation.bind(this, function(response) {
        var json = JSON.parse(response);
        var data = json.data;
        console.log('got check response', json, data);
        if (!data.file_exists) {
          this.progressbar.setlabel("uploading...");
          this.upload_data();
        } else {
          this.calculateChecksum(elation.bind(this, function(md5) {
            if (md5 == data.file_checksum) {
              console.log('file exists, and checksums match (' + md5 + ' == ' + data.file_checksum + ')');
              this.upload_complete();
            } else {
              console.log('file exists, but checksums DO NOT match (' + md5 + ' != ' + data.file_checksum + ')');
              // TODO - prompt user for action (overwrite/rename/cancel)
            }
          })); 
        }
      })
    });
  }
  this.upload_data = function() {
    var uploadargs = {
      dirname: this.dirname,
      upload: this.file
    };
    this.uploading = elation.net.post('/filehost/upload.js', uploadargs, {
      callback: elation.bind(this, this.upload_complete),
      onprogress: elation.bind(this, this.upload_progress)
    });
  }
  this.upload_progress = function(ev) {
    if (ev.lengthComputable) {
      var percent = Math.round((ev.loaded / ev.total) * 100);
      this.progressbar.setlabel((percent == 100 ? 'processing...' : "uploading..." + percent + '%'));
      this.progressbar.set(percent);
    }
  }
  this.upload_complete = function(ev) {
    console.log('done');
    this.progressbar.setlabel('complete');
    this.progressbar.set(100);
  }
  this.rename = function(newdirname, newfilename) {
    var urlargs = {
      dirname: this.dirname,
      filename: this.filename,
      newdirname: newdirname,
      newfilename: newfilename
    };
    elation.net.get('/filehost/rename.js', urlargs, {
      callback: elation.bind(this, this.rename_callback)
    });
  }
  this.rename_callback = function(ev) {
    console.log("rename status:", ev);
  }
});


elation.component.add('filehost.file_metadata', function() {
  this.init = function() {
    this.file = this.args.file;
    console.log(this.file);
    //this.container.innerHTML = this.prettySize(this.file.filesize) + '<br>' + this.file.modified_time;
    this.list = elation.ui.list(null, elation.html.create({append: this.container}), {
      items: [
        {label: 'File type: ' + this.file.filetype, classname: 'filehost_file_metadata_filetype'},
        {label: 'File size: ' + this.prettySize(this.file.filesize), classname: 'filehost_file_metadata_filesize'},
        {label: 'Last modified: ' + this.file.modified_time, classname: 'filehost_file_metadata_modified_time'}
      ]
    });
  }
  this.prettySize = function(size) {
    var sizes = ['b', 'KB', 'MB', 'GB', 'TB'];
    for (var i = 0; i < sizes.length; i++) {
      var scalesize = size / Math.pow(1000, i);
      if (scalesize < 1000) {
        return scalesize.toFixed(1) + sizes[i];
      }
    }
    return size + 'b';
  }
});
elation.component.add('filehost.file_actions', function() {
  this.init = function() {
  }
});
