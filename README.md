# freemixer.github.io

The package repositories of the public FreeMixer tools, served by GitHub Pages: `rpm/` for dnf and `deb/` for apt.

Nothing under `rpm/fedora/` or `deb/debian/` is edited by hand. The release workflow of each package
(`FreeMixer/.github`, `build-rpm.yml` and `build-deb.yml`) adds its signed packages and regenerates and signs
the metadata, on a version tag. The website (`index.html` and the other top-level paths listed in
`deploy/site-owns.txt` of FreeMixer/openmixer-www) is written by that repository's pages workflow, which
never touches `rpm/`, `deb/`, the keys or `.nojekyll`. Committed by hand: `rpm/freemixer.repo`, this file.

```
index.html, docs/, ...                   the website, from FreeMixer/openmixer-www
rpm/freemixer.repo                       the file dnf installs
rpm/RPM-GPG-KEY-freemixer                the signing key
rpm/fedora/<release>/<arch>/             x86_64, aarch64, SRPMS: packages and repodata/ (repomd.xml.asc)
deb/freemixer.asc                        the signing key, armored, for signed-by
deb/debian/<suite>/                      bookworm, trixie: Packages, Release, InRelease, Release.gpg
deb/debian/<suite>/<arch>/               amd64, arm64: the .deb files
```
