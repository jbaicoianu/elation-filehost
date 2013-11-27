elation.component.add("filehost.view", function() {
  this.init = function() {
    elation.html.addclass(this.container, 'filehost_view');
    this.directory = this.args.directory || false;

    this.fileview = elation.filehost.filelist(null, elation.html.create({append: this.container}), {directory: this.directory, files: this.args.files});
  }
});
