elation.component.add("filehost.upload", function() {
  this.init = function() {
    this.uploading = [];
    this.images = [];
    this.progressbars = [];
    this.proxyupload = false;
    this.dirname = "uploads";

    elation.html.addclass(this.container, 'filehost_upload');
    if (this.container.upload) {
      elation.events.add(this.container.upload, 'change', elation.bind(this, this.change));
    }
    elation.html.addclass(this.container, 'state_enabled');
    elation.events.add(this.container, 'submit', this);
    var buttons = elation.find('button', this.container);
    if (buttons[0]) {
      this.button = buttons[0];
    }
    elation.events.add(window, 'keydown,dragenter,mouseover,dragover,dragleave,drop', this);

    elation.events.add(this.container, 'dragmove', this);
    this.dragtarget = this.container;
    if (this.args.dragtarget) {
      var els = elation.find(this.args.dragtarget)
      if (els.length > 0) {
        this.dragtarget = els[0];
      }
    }
    elation.html.addclass(this.dragtarget, 'filehost_upload_dragtarget');

    this.directoryview = elation.filehost.directorytree(null, elation.html.create({append: this.container}), {directories: this.args.directories, selected: this.dirname});
    this.fileview = elation.filehost.filelist(null, elation.html.create({append: this.container}), {files: this.args.files});

    elation.events.add(this.directoryview, "directory_change", elation.bind(this, function(ev) { 
      console.log('changed directory to ', ev.data);
      this.dirname = ev.data;
      this.fileview.setDirectory(this.dirname);
    }));

    this.reset();
  }
  this.reset = function(keepprogress) {
    var upload = this.container['upload'];
    //upload.style.display = 'none';
    if (!keepprogress && this.progressbars.length > 0) {
      for (var i = 0; i < this.progressbars.length; i++) {
        if (this.progressbars[i]) {
          upload.parentNode.removeChild(this.progressbars[i].container);
          this.progressbars[i] = false;
        }
      }
    } 
    if (this.button) {
      this.button.disabled = false;
      this.button.innerHTML = 'Choose File';
    }
    //this.uploading = [];
    //this.container.reset();
  }
  this.getxhr = function(upload) {
    for (var i = 0; i < this.uploading.length; i++) {
      if (this.uploading[i].xmlhttp.upload == upload) return i;
    }
    return -1;
  }
  this.setdragtarget = function(isdroppable, istarget) {
    if (isdroppable) {
      elation.html.removeclass(this.dragtarget, 'state_active');
      elation.html.addclass(this.dragtarget, 'state_droppable');
      if (this.button) {
        elation.html.addclass(this.button, 'tf_ui_button_hover');
        this.button.innerHTML = 'Drop Files';
      }
    } else if (istarget) {
      elation.html.removeclass(this.dragtarget, 'state_droppable');
      elation.html.addclass(this.dragtarget, 'state_active');
      if (this.button) {
        elation.html.addclass(this.button, 'tf_ui_button_hover');
        this.button.innerHTML = 'Drop Files';
      }
    } else {
      elation.html.removeclass(this.dragtarget, 'state_active');
      elation.html.removeclass(this.dragtarget, 'state_droppable');
      if (this.button) {
        elation.html.removeclass(this.button, 'tf_ui_button_hover');
        this.button.innerHTML = 'Choose File';
      }
    }
  }
  this.submit = function(ev) {
    var upload = this.container['upload'];
    var cancelevent = false;
    if (upload) {
      if (upload.files) {
        if (upload.files.length == 0) {
          upload.click();
        } else {
          this.upload(upload.files[0]);
        }
        cancelevent = true;
      } else {
        if (upload.value == '') {
          upload.click();
          cancelevent = true;
        } else {
          this.container.submitbutton.click();
        }
      }
    }
    if (ev && cancelevent) {
      ev.preventDefault();
    }
  }
  this.change = function(ev) {
    if (this.simple) {
      this.container.submit()
    } else {
      this.submit();
    }
  }
  this.upload = function(file, index) {
    console.log('start upload', file, index);
    if (file) {
      var i = (typeof index == 'undefined' ? this.images.length : index);
      if (!this.images[i]) {
        var fileobj = elation.filehost.file(null, elation.html.create(), {name: file.name, file: file, dirname: this.dirname});
        this.fileview.list.addItemAtPosition(fileobj, 0);
        fileobj.upload();
      }
    }
  }
  this.finish = function(ev, xhr) {
    if (!xhr) return;
    var idx = this.getxhr((xhr instanceof XMLHttpRequest ? xhr.upload : xhr.xmlhttp.upload));
    var reallycomplete = true;
    for (var i = 0; i < this.progressbars.length; i++) {
      if (i === idx) {
        this.progressbars[i].setcomplete();
        this.progressbars[i].setlabel('complete');
      }
      reallycomplete = reallycomplete && (this.progressbars[i] === false || this.progressbars[i].complete);
    }
    if (reallycomplete) {
      this.reset(true);
    }
    var data = null;
    if (ev.data) {
      data = ev.data;
    } else {
      var tmpdata = elation.JSON.parse(ev);
      if (tmpdata.data) {
        data = tmpdata.data;
      } else {
        data = tmpdata;
      }
    }
    this.finishupload(data);
  }
  this.load = function(ev) {
    var idoc = (ev.target.contentWindow ? ev.target.contentWindow.document : ev.target.contentDocument);
    var page = idoc.location.href;
    if (page != '' && page != 'about:blank') {
      var text = idoc.body.textContent || idoc.body.innerText;
      try {
        var response = elation.JSON.parse(text);
        this.finishupload(response.data);
      } catch (e) {
        console.log('Invalid response while uploading image: ' + data, e.stack);
      }
    }
  }
  this.finishupload = function(data) {
    elation.events.fire({type: 'facebook_photo_upload', data: data});

    // if no post_id in return, image did not successfully upload. Add messaging (ballpark restrictions)
    console.log("post_id=", data.post_id);
    if (!data.post_id) {
      alert("Image did not upload.\nPlease upload valid image no larger than 2mb and 2048px by 2048px");
    }
  }
  this.error = function(ev, retryfile) {
    var idx = this.getxhr(ev.upload);
    if (retryfile && idx != -1 && !this.progressbars[idx].cancelled) {
      // retry upload as non-proxied upload, since it's less error-prone
      this.proxyupload = true;
      this.upload(retryfile, idx);
    } else {
      if (idx != -1) {
        this.progressbars[idx].setcancelled();
        this.progressbars[idx].setlabel('failed!');
      }

      var allcancelled = true;
      for (var i = 0; i < this.progressbars.length; i++) {
        allcancelled = allcancelled && (this.progressbars[i] === false || this.progressbars[i].cancelled);
      }
      if (allcancelled) {
        this.reset(true);
      }
    }
  }
  this.keydown = function(ev) {
    switch (ev.keyCode) {
      case 27: // esc
        if (this.uploading && this.uploading.length > 0) {
          for (var i = 0; i < this.uploading.length; i++) {
            this.progressbars[i].setcancelled();
            setTimeout(elation.bind(this.uploading[i].xmlhttp, function() { this.abort(); }), 1000 * i);
          }
          ev.stopPropagation();
          ev.preventDefault();
          // alerts are horrible, but otherwise the keyup event closes all popups...
          alert('uploads cancelled!');
        }
        break;
    }
  }
  this.dragenter = function(ev) {
    this.setdragtarget(elation.utils.isin(this.dragtarget, ev.target), true);
  }
  this.dragover = function(ev) {
    ev.preventDefault();
  }
  this.dragleave = function(ev) {
    if (ev.pageX == 0) {
      this.setdragtarget(false, false);
    }
  }
  this.mouseover = function(ev) {
    //this.setdragtarget(false, false);
  }
  this.dragend = function(ev) {
    //console.log(ev.type, ev);
  }
  this.drop = function(ev) {
    ev.preventDefault();
    if (elation.utils.isin(this.dragtarget, ev.target)) {
      for (var i = 0; i < ev.dataTransfer.files.length; i++) {
        var file = ev.dataTransfer.files[i];
        //if (file.type.match(/^image\//)) {
          this.upload(ev.dataTransfer.files[i]);
        //} else {
        //  console.log('unsupported filetype', file.type, file);
        //}
      }
    }
    this.setdragtarget(false, false);
  }
});

