# freemixer.github.io

The package repositories of the public FreeMixer tools, served by GitHub Pages: `rpm/` for dnf and `deb/` for apt.

Nothing under `rpm/fedora/` or `deb/debian/` is edited by hand. The release workflow of each package
(`FreeMixer/.github`, `build-rpm.yml` and `build-deb.yml`) adds its signed packages and regenerates and signs
the metadata, on a version tag. The website (`index.html` and the other top-level paths listed in
`deploy/site-owns.txt` of FreeMixer/openmixer-www) is written by that repository's pages workflow, which
never touches `rpm/`, `deb/`, the keys or `.nojekyll`. Committed by hand: `rpm/freemixer.repo`, this file.

The two key files hold EVERY key the channel signs with, and the publish workflows only ever add to them
(`channel-keys.sh` in FreeMixer/.github). A new signing key is committed into both files by hand before
the first release it signs, and a key leaves them only by hand, when its retirement is decided. Today they
hold the original key `618C08DC2CE0B56AB8789DFBA14B3E1E1F69EBF4` and the OpenMixer release key
`5CB7E2D404C46D6A16F05D871B5B7D400616FA4D` (packages@openmixer.org), which signs every release once the workflows switch to it. dnf
imports from `gpgkey=` the key a package or `repomd.xml` names. apt reads the copy of `freemixer.asc` saved
at install time, so while installs may hold only the original key, the apt index is signed by both keys.

```
index.html, docs/, ...                   the website, from FreeMixer/openmixer-www
rpm/freemixer.repo                       the file dnf installs
rpm/RPM-GPG-KEY-freemixer                the signing keys
rpm/fedora/<release>/<arch>/             x86_64, aarch64, SRPMS: packages and repodata/ (repomd.xml.asc)
deb/freemixer.asc                        the signing keys, armored, for signed-by
deb/debian/<suite>/                      bookworm, trixie: Packages, Release, InRelease, Release.gpg
deb/debian/<suite>/<arch>/               amd64, arm64: the .deb files
```
