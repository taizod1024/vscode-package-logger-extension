# package-logger

Output Windows application, package list with version and config.
Use it with Git.

- package-logger
  - os
    - system information
      ```
      PS> systeminfo
      ```
    - windows features
      ```
      PS> Get-WindowsOptionalFeature -Online
      ```
    - windows services
      ```
      PS> Get-Service
      ```
    - environment variable
      ```
      PS> Get-ChildItem env:
      ```
  - package
    - windows application list
      ```
      PS> Get-ChildItem `
        Registry::HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\Uninstall, `
        Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall, `
        Registry::HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall
      ```
    - chocolatey package list and config
      ```
      PS> choco config list
      PS> choco list --local-only
      ```
    - git config
      ```
      PS> git config --list
      ```
    - nodejs package list and config
      ```
      PS> npm config list
      PS> npm list --global
      PS> nvm list
      ```
    - python package list and config
      ```
      PS> pip config list
      PS> pip list
      ```
    - vscode extension list
      ```
      PS> code --list-extensions -show-versions
      ```
  - office
    - excel addins
    - word addins
    - powerpoint addins
    - outlook addins
      ```
      PS> Get-ChildItem `
        Registry::HKEY_CURRENT_USER\SOFTWARE\Microsoft\Office\<OFFICE_APP>\Addins, `
        Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Office\<OFFICE_APP>\Addins, `
        Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\Office\<OFFICE_APP>\Addins
      ```
