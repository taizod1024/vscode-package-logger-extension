import * as vscode from "vscode";

/** winpkglog-extesnion class */
class PackageLogger {

  /** application id for vscode */
  public appid = "package-logger";

  /** flag for debug  */
  public debug: boolean;

  /** channel on vscode */
  public channel: vscode.OutputChannel;

  /** constructor */
  constructor() { }

  /** activate extension */
  public activate(context: vscode.ExtensionContext) {

    // init context
    this.channel = vscode.window.createOutputChannel(this.appid);
    this.channel.appendLine(`[${this.timestamp()}] ${this.appid} activated`);

    // init context
    this.debug = false;

    // init vscode
    context.subscriptions.push(
      vscode.commands.registerCommand(`${this.appid}.toggleDebug`, () => {
        this.toggleDebug();
      })
    );
  }

  /** toggle debug */
  public toggleDebug() {
    this.channel.appendLine(`--------`);

    this.setDebug(!this.debug);
  }

  /** set debug */
  public setDebug(debug: boolean, force = false) {
    this.channel.appendLine(`[${this.timestamp()}] setDebug(${[...arguments]})`);

    if (this.debug !== debug || force) {
      this.debug = debug;
      vscode.commands.executeCommand("setContext", `${this.appid}Debug`, this.debug);
    }
  }

  /** return timestamp string */
  public timestamp(): string {
    return new Date().toLocaleString("ja-JP").split(" ")[1];
  }
}
export const packagelogger = new PackageLogger();
