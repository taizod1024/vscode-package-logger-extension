import * as vscode from "vscode";
import * as fs from "fs";
import child_process, { ExecFileSyncOptions } from "child_process";
import { resolve } from "path/posix";
import { rejects } from "assert";

/** promise with timeout */
const timeoutPromise = (func: () => void) => {
  return new Promise((resolve, reject) => {
    setTimeout(function () {
      try {
        func();
        resolve(true);
      } catch (ex) {
        reject(ex);
      }
    });
  });
};

/** package-logger-extesnion class */
class PackageLogger {
  /** application id for vscode */
  public appid = "package-logger";

  /** channel on vscode */
  public channel: vscode.OutputChannel;

  /** project path */
  public projectPath: string;

  /** app path */
  public appPath: string;

  /** computer name */
  public computerName: string;

  /** extension path */
  public extensionPath: string;

  /** constructor */
  constructor() {}

  /** activate extension */
  public activate(context: vscode.ExtensionContext) {
    // init context
    this.channel = vscode.window.createOutputChannel(this.appid);
    this.channel.appendLine(`[${this.timestamp()}] ${this.appid} activated`);

    // init vscode
    context.subscriptions.push(
      vscode.commands.registerCommand(`${this.appid}.updateAndLogPackage`, async () => {
        this.channel.show();
        this.extensionPath = context.extensionPath;
        try {
          await this.checkProjectPathAsync();
          await this.updatePackageAsync();
          await this.logPackageAsync();
        } catch (reason) {
          packagelogger.channel.appendLine("**** " + reason + " ****");
        }
      })
    );
  }

  /** check project path */
  public async checkProjectPathAsync() {
    // check project path
    this.projectPath = null;
    if (vscode.workspace.workspaceFolders?.length !== 1) {
      throw "ERROR: no root or multi root is not supported";
    }
    this.projectPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    this.appPath = `${this.projectPath}\\${this.appid}`;

    // confirm make folder
    if (!fs.existsSync(this.appPath)) {
      let plchld = ` ${this.appid} FOLDER NOT FOUND, MAKE ${this.appid} FOLDER ?`;
      let choice = `YES, MAKE ${this.appid} FOLDER.`;
      return vscode.window
        .showQuickPick([choice], {
          placeHolder: plchld,
          ignoreFocusOut: true,
        })
        .then(confirm => {
          if (confirm !== choice) {
            throw "CANCELED";
          }
        });
    }
  }

  /** update package async */
  public async updatePackageAsync() {
    // show channel
    this.channel.appendLine(`--------`);
    this.channel.appendLine(`[${this.timestamp()}] updatePackage:`);

    // exec command as administrator
    this.channel.appendLine(`[${this.timestamp()}] - update`);
    let cmd = `powershell -command start-process 'cmd.exe' '/c ${this.extensionPath}\\bin\\log_package.cmd ${process.env.TMP}' -verb runas -wait`;
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd}`);
    this.execCommand(cmd);

    this.channel.appendLine(`[${this.timestamp()}] - done`);
  }

  /** log package async */
  public async logPackageAsync() {
    // show channel
    this.channel.appendLine(`--------`);
    this.channel.appendLine(`[${this.timestamp()}] logPackage:`);
    this.channel.appendLine(`[${this.timestamp()}] - projectpath: ${this.projectPath}`);

    // check computername
    this.computerName = process.env.computername;
    if (this.computerName === null) {
      throw `ERROR: environment variable COMPUTERNAME missing`;
    }
    this.channel.appendLine(`[${this.timestamp()}] - computername: ${this.computerName}`);

    // log any
    let machine: any = { os: {}, package: {} };
    await timeoutPromise(() => this.logOsSystem(machine));
    await timeoutPromise(() => this.logOsFeature(machine));
    await timeoutPromise(() => this.logOsService(machine));
    await timeoutPromise(() => this.logOsEnv(machine));
    await timeoutPromise(() => this.logOsStartup(machine));
    await timeoutPromise(() => this.logPkgApp(machine));
    await timeoutPromise(() => this.logPKgChocolatey(machine));
    await timeoutPromise(() => this.logPkgNodejs(machine));
    await timeoutPromise(() => this.logPkgPython(machine));
    await timeoutPromise(() => this.logPkgVscode(machine));
    await timeoutPromise(() => this.logPkgGit(machine));
    await timeoutPromise(() => this.logOfficeApp(machine));

    // output log
    this.outputLog(machine);

    this.channel.appendLine(`[${this.timestamp()}] - done`);
  }

  /** log os system */
  public logOsSystem(machine: any) {
    machine.os.system = {};

    let path = `${process.env.TMP}\\package-logger_os_system_systeminfo.txt`;
    if (fs.existsSync(path)) {
      let text = fs.readFileSync(path).toString().trim();
      machine.os.system.systeminfo = text;
    }

    // show channel
    this.channel.appendLine(`[${this.timestamp()}] - systeminfo`);

    // show command
    let cmd = "systeminfo";
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd}`);
    let text = this.execCommand(`chcp 65001 1>NUL && ${cmd}`);
    if (!text) {
      this.channel.appendLine(`[${this.timestamp()}]     => systeminfo failed`);
      return;
    }

    // modify processor clock
    text = text.replace(/~[0-9]+ Mhz/g, "~xxxx Mhz");

    // name to be excluded
    let excludes = ["System Boot Time:", "Available Physical Memory:", "Virtual Memory: Available:", "Virtual Memory: In Use:"];

    // modify text
    let lines = text.split(/[\r\n]+/);
    let value = "";
    for (const line of lines) {
      if (excludes.some(val => line.startsWith(val))) continue; // exclude dynamic section
      value += line + "\r\n";
    }
    machine.os.system.systeminfo = value;
  }

  /** log os env */
  public logOsEnv(machine: any) {
    // show channel
    this.channel.appendLine(`[${this.timestamp()}] - environment variables`);

    // name to be excluded because of context
    let excludes = [
      "__COMPAT_LAYER", // for uac
      "ELECTRON_RUN_AS_NODE", // for electron
      "VSCODE_", // for vscode
      "APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL", // for debug
      "CHROME_CRASHPAD_PIPE_NAME", // for chrome
      "SESSIONNAME", // for child process
    ];

    // get env from process information
    machine.os.env = {};
    for (const envname in process.env) {
      if (excludes.some(val => envname.startsWith(val))) continue; // exclude context
      let name = envname;
      let value = process.env[envname] || "";
      if (value.indexOf(";") < 0) {
        value = `${envname}=${value}`; // single value
      } else {
        value = `${envname}=\r\n` + value.replace(/;/g, "\r\n"); // multivalue
      }
      machine.os.env[name] = value;
    }
  }

  /** log os feature */
  public logOsFeature(machine: any) {
    // show channel
    this.channel.appendLine(`[${this.timestamp()}] - feature`);
    this.channel.appendLine(`[${this.timestamp()}]   $ dism /Online /Get-Features /English`);

    let path = `${process.env.TMP}\\package-logger_os_feature.txt`;
    if (!fs.existsSync(path)) {
      this.channel.appendLine(`[${this.timestamp()}]     => dism failed`);
    } else {
      let text = fs.readFileSync(path).toString().trim();
      let lines = text
        .split(/[\r\n]+/)
        .map(val => val.trim())
        .filter(val => val);
      fs.unlinkSync(path);
      machine.os.feature = {};
      for (const line of lines) {
        machine.os.feature[line] = line;
      }
    }
  }

  /** log os service */
  public logOsService(machine: any) {
    // show channel
    this.channel.appendLine(`[${this.timestamp()}] - service`);
    this.channel.appendLine(`[${this.timestamp()}]   $ powershell -command "Get-Service"`);

    let path = `${process.env.TMP}\\package-logger_os_service.txt`;
    if (!fs.existsSync(path)) {
      this.channel.appendLine(`[${this.timestamp()}]     => Get-Service failed`);
    } else {
      let text = fs.readFileSync(path).toString().trim();
      let lines = text
        .split(/[\r\n]+/)
        .map(val => val.trim())
        .filter(val => val);
      fs.unlinkSync(path);
      machine.os.service = {};
      for (const line of lines) {
        let words = line.split(/:/);
        let name = words[0];
        machine.os.service[name] = line;
      }
    }
  }

  /** log os startup */
  public logOsStartup(machine: any) {
    // show channel
    let command1 = 'dir /b "%APPDATA%MicrosoftWindowsStart MenuProgramsStartup"';
    let command2 = 'dir /b "%ALLUSERSPROFILE%MicrosoftWindowsStart MenuProgramsStartUp"';
    this.channel.appendLine(`[${this.timestamp()}] - startup`);
    this.channel.appendLine(`[${this.timestamp()}]   $ ${command1}`);
    this.channel.appendLine(`[${this.timestamp()}]   $ ${command2}`);

    let path = `${process.env.TMP}\\package-logger_os_startup.txt`;
    if (!fs.existsSync(path)) {
      this.channel.appendLine(`[${this.timestamp()}]     => dir failed`);
    } else {
      let text = fs.readFileSync(path).toString().trim();
      let lines = text
        .split(/[\r\n]+/)
        .map(val => val.trim())
        .filter(val => val);
      fs.unlinkSync(path);
      machine.os.startup = {};
      for (const line of lines) {
        let words = line.split(/:/);
        let name = words[0];
        machine.os.startup[name] = line;
      }
    }
  }

  /** log pkg app */
  public logPkgApp(machine: any) {
    // show channel
    this.channel.appendLine(`[${this.timestamp()}] - app`);

    // show command
    let cmd1 = `reg query HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall /s`;
    let cmd2 = `reg query HKEY_LOCAL_MACHINE\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall /s`;
    let cmd3 = `reg query HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall /s`;
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd1}`);
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd2}`);
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd3}`);

    let text = "";
    text += (this.execCommand(`chcp 65001 1>NUL && ${cmd1}`) || "") + "\r\n";
    text += (this.execCommand(`chcp 65001 1>NUL && ${cmd2}`) || "") + "\r\n";
    text += (this.execCommand(`chcp 65001 1>NUL && ${cmd3}`) || "") + "\r\n";
    text += "HKEY"; // for sentinel
    if (!text) {
      this.channel.appendLine(`[${this.timestamp()}]     => reg failed`);
      return;
    }

    machine.package.app = {};
    let lines = text.split(/[\r\n]+/);
    lines.shift(); // delete first line

    // get app from command result
    let displayname = null;
    let displayversion = null;
    for (const line of lines) {
      let words = line.trim().split(/ +/);
      if (words[0] === "DisplayName") displayname = words.slice(2).join(" ");
      if (words[0] === "DisplayVersion") displayversion = words[2];

      if (line.startsWith("HKEY") && displayname) {
        let name;
        let value = name;
        if (!displayversion) {
          name = displayname;
          value = displayname;
        } else {
          name = displayname;
          value = `${displayname}@${displayversion}`;
        }
        machine.package.app[name] = value;

        displayname = null;
        displayversion = null;
      }
    }
  }

  /** log pkg chocolatey */
  public logPKgChocolatey(machine: any) {
    // show channel
    this.channel.appendLine(`[${this.timestamp()}] - chocolatey`);

    // show list command
    let cmd = "choco list --local-only";
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd}`);
    let text = this.execCommand(cmd);
    if (!text) {
      this.channel.appendLine(`[${this.timestamp()}]     => chocolatey not found`);
      return;
    }

    // get packages from command result
    machine.package.chocolatey = {};
    let lines = text.split(/[\r\n]+/);
    lines.pop(); // delete last line"

    for (const line of lines) {
      // ignore message
      if (line.indexOf("validations performed.") >= 0) continue;
      if (line.startsWith("Validation Warnings:")) continue;
      if (line.startsWith(" - A pending system reboot request has been detected, however, this is")) continue;
      if (line.startsWith("   being ignored due to the current command being used 'list'.")) continue;
      if (line.startsWith("   It is recommended that you reboot at your earliest convenience.")) continue;

      let words = line.split(/ +/);
      if (words.length !== 2) continue; // check name and version
      let name = words[0];
      let value = words.join("@");
      if (name && value) {
        machine.package.chocolatey[name] = value;
      }
    }

    // show config command
    cmd = "choco config list";
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd}`);
    text = this.execCommand(cmd);
    machine.package.chocolatey._choco_config_list = text;
  }

  /** log pkg nodejs */
  public logPkgNodejs(machine: any) {
    // show channel
    this.channel.appendLine(`[${this.timestamp()}] - nodejs`);

    // show list command
    let cmd = "npm list --global";
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd}`);
    let text = this.execCommand(cmd);
    if (!text) {
      this.channel.appendLine(`[${this.timestamp()}]     => npm not found`);
      return;
    }

    // get packages from command result
    machine.package.nodejs = {};
    let lines = text.split(/[\r\n]+/);
    lines.shift(); // delete first line
    for (const line of lines) {
      if (line.endsWith("packages installed.")) continue;

      // ignore message
      if (line.startsWith("Did you know Pro / Business automatically syncs with Programs and")) continue;
      if (line.startsWith(" Features? Learn more about Package Synchronizer at")) continue;
      if (line.startsWith(" https://chocolatey.org/compare")) continue;

      let match = line.match(/ (([^ ]+)@[^ ]+)/);
      if (match) {
        let name = match[2];
        let value = match[1];
        machine.package.nodejs[name] = value;
      }
    }

    // show config command
    cmd = "npm config list";
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd}`);
    text = this.execCommand(cmd);
    machine.package.nodejs._npm_config_list = text;

    // show nvm command
    cmd = "nvm list";
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd}`);
    text = this.execCommand(cmd, false);
    if (!text) {
      this.channel.appendLine(`[${this.timestamp()}]     => nvm not found`);
    } else {
      machine.package.nodejs._nvm_list = text;
    }
  }

  /** log pkg python */
  public logPkgPython(machine: any) {
    // show channel
    this.channel.appendLine(`[${this.timestamp()}] - python`);

    // show list command
    let cmd = "pip list";
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd}`);
    let text = this.execCommand(cmd);
    if (!text) {
      this.channel.appendLine(`[${this.timestamp()}]     => pip not found`);
      return;
    }

    // get packages from command result
    machine.package.python = {};
    let lines = text.split(/[\r\n]+/);
    lines.shift(); // delete first line
    lines.shift(); // delete second line
    for (const line of lines) {
      let words = line.split(/ +/);
      let name = words[0];
      let value = words.join("@");
      if (name && value) {
        machine.package.python[name] = value;
      }
    }

    // show config command
    cmd = "pip config list";
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd}`);
    text = this.execCommand(cmd);
    machine.package.python._pip_config_list = text;
  }

  /** log pkg vscode */
  public logPkgVscode(machine: any) {
    // show channel
    this.channel.appendLine(`[${this.timestamp()}] - vscode`);

    // show list command
    let cmd = "code --list-extensions --show-versions";
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd}`);
    let text = this.execCommand(cmd);
    if (!text) {
      this.channel.appendLine(`[${this.timestamp()}]     => vscode not found`);
      return;
    }

    // get packages from command result
    machine.package.vscode = {};
    let lines = text.split(/[\r\n]+/);
    for (const line of lines) {
      let words = line.split("@");
      let name = words[0];
      let value = line;
      if (name && value) {
        machine.package.vscode[name] = value;
      }
    }

    // settings.json
    let paths = `${process.env.APPDATA}\\Code\\User\\settings.json`;
    this.channel.appendLine(`[${this.timestamp()}]   $ ${paths}`);
    if (!fs.existsSync(paths)) {
      this.channel.appendLine(`[${this.timestamp()}]     => settings.json not found`);
    } else {
      let text = fs.readFileSync(paths);
      machine.package.vscode["_settings.json"] = text;
    }

    // keybindings.json
    let pathk = `${process.env.APPDATA}\\Code\\User\\keybindings.json`;
    this.channel.appendLine(`[${this.timestamp()}]   $ ${pathk}`);
    if (!fs.existsSync(pathk)) {
      this.channel.appendLine(`[${this.timestamp()}]     => keybindings.json not found`);
    } else {
      let text = fs.readFileSync(pathk);
      machine.package.vscode["_keybindings.json"] = text;
    }
  }

  /** log pkg git */
  public logPkgGit(machine: any) {
    // show channel
    this.channel.appendLine(`[${this.timestamp()}] - git`);

    // show config command
    let cmd = "git config --list";
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd}`);
    let text = this.execCommand(cmd);
    if (!text) {
      this.channel.appendLine(`[${this.timestamp()}]     => git not found`);
    } else {
      machine.package.git = {};
      machine.package.git._git_config_list = text;
    }
  }

  /** log office app */
  public logOfficeApp(machine: any) {
    machine.office = {};
    ["excel", "outlook", "powerpoint", "word"].forEach(app => {
      // show channel
      let command1 = `reg query HKCU\\SOFTWARE\\Microsoft\\Office\\${app}\\Addins /s /t REG_SZ /v FriendlyName`;
      let command2 = `reg query HKLM\\SOFTWARE\\Microsoft\\Office\\${app}\\Addins /s /t REG_SZ /v FriendlyName`;
      let command3 = `reg query HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Office\\${app}\\Addins /s /t REG_SZ /v FriendlyName`;
      this.channel.appendLine(`[${this.timestamp()}] - office ${app}`);
      this.channel.appendLine(`[${this.timestamp()}]   $ ${command1}`);
      this.channel.appendLine(`[${this.timestamp()}]   $ ${command2}`);
      this.channel.appendLine(`[${this.timestamp()}]   $ ${command3}`);

      let path = `${process.env.TMP}\\package-logger_office_${app}.txt`;
      if (!fs.existsSync(path)) {
        this.channel.appendLine(`[${this.timestamp()}]     => reg failed`);
      } else {
        let text = fs.readFileSync(path).toString().trim();
        let lines = text
          .split(/[\r\n]+/)
          .map(val => val.trim())
          .filter(val => val);
        fs.unlinkSync(path);
        machine.office[app] = {};
        for (const line of lines) {
          let words = line.split(/:/);
          let name = words[0];
          machine.office[app][name] = line;
        }
      }
    });
  }

  //** output log */
  public outputLog(machine: any) {
    this.channel.appendLine(`[${this.timestamp()}] - output`);

    // check apppath
    if (!fs.existsSync(this.appPath)) {
      fs.mkdirSync(this.appPath);
    }

    // clear compuernamepath
    let computernamepath = `${this.appPath}\\${this.computerName}`;
    if (fs.existsSync(computernamepath)) {
      fs.rmSync(computernamepath, { recursive: true, force: true });
    }
    fs.mkdirSync(computernamepath, { recursive: true });

    // output log
    for (const cat1 in machine) {
      fs.mkdirSync(`${computernamepath}\\${cat1}`);
      for (const cat2 in machine[cat1]) {
        fs.mkdirSync(`${computernamepath}\\${cat1}\\${cat2}`);
        for (const cat3 in machine[cat1][cat2]) {
          let cat3x = cat3.replace(/[/]/g, "-").replace(/[:\\\*\?\"\|<>]/g, ""); // : / \ * ? " |< >
          if (cat3 !== cat3x) {
            this.channel.appendLine(`[${this.timestamp()}]   - rename: ${cat3} -> ${cat3x}`);
          }
          try {
            fs.writeFileSync(`${computernamepath}\\${cat1}\\${cat2}\\${cat3x}`, machine[cat1][cat2][cat3]);
          } catch (ex) {
            throw ex;
          }
        }
      }
    }
  }

  /** execute command */
  public execCommand(cmd: string, trim = true): string {
    let text = null;
    try {
      const options = { cwd: this.projectPath };
      text = child_process.execSync(cmd, options).toString();
      if (trim) text = text.trim();
    } catch (ex) {}
    return text;
  }

  /** return timestamp string */
  public timestamp(): string {
    return new Date().toLocaleString("ja-JP").split(" ")[1];
  }
}
export const packagelogger = new PackageLogger();
