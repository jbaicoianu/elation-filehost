{dependency name="utils.dust"}
{dependency name="utils.template"}
{dependency name="ui.progressbar"}
{dependency name="ui.button"}
{dependency name="ui.buttonbar"}
{dependency name="ui.treeview"}
{dependency name="ui.list"}
{dependency name="ui.select"}
{dependency name="ui.label"}
{dependency name="ui.panel"}
{dependency name="ui.spinner"}
{dependency name="filehost"}
{dependency name="filehost.ext.resize"}
{dependency name="filehost.ext.md5"}
{dependency name="filehost.directorytree"}
{dependency name="filehost.filelist"}
{dependency name="filehost.file"}
{dependency name="filehost.view"}

{set var="page.title"}File Manager{if !empty($dirname)} - {$dirname}{/if}{/set}

<div data-elation-component="filehost.view">
  <data class="elation-args" name="directory">{jsonencode var=$directory}</data>
  <data class="elation-args" name="files">{jsonencode var=$files}</data>
</div>

