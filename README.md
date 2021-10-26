# package-logger

Output Windows application and package list with version.
Use it with Git.

- package-logger
  - os
    - system information  
      ```
      systeminfo
      ```
    - environment variables
  - package
    - windows application list  
      ```
      reg query HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\Uninstall /s
      reg query HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall /s
      reg query HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall /s
      ```
    - [chocolatey](https://chocolatey.org/) package list  
      ```
      choco list --local-only
      ```
    - [nodejs](https://www.npmjs.com/) package list  
      ```
      npm list --global
      ```
    - [python](https://pypi.org/) package list  
      ```
      pip list
      ```
    - [vscode](https://marketplace.visualstudio.com/vscode) extension list  
      ```
      code --list-extensions -show-versions
      ```
