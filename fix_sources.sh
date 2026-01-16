#!/bin/bash

# Backup existing sources.list
sudo cp /etc/apt/sources.list /etc/apt/sources.list.bak

# Create new sources.list content (Minimal stable repositories)
# Removing backports to avoid Release file errors
cat <<EOF | sudo tee /etc/apt/sources.list
deb http://deb.debian.org/debian bullseye main contrib non-free
deb-src http://deb.debian.org/debian bullseye main contrib non-free

deb http://deb.debian.org/debian-security/ bullseye-security main contrib non-free
deb-src http://deb.debian.org/debian-security/ bullseye-security main contrib non-free

deb http://deb.debian.org/debian bullseye-updates main contrib non-free
deb-src http://deb.debian.org/debian bullseye-updates main contrib non-free
EOF

# Disable conflicting files in sources.list.d
# We rename them to .bak so apt ignores them
if [ -d "/etc/apt/sources.list.d" ]; then
    echo "Checking for conflicting files in /etc/apt/sources.list.d..."
    for file in /etc/apt/sources.list.d/*.list; do
        if [ -f "$file" ]; then
            echo "Disabling $file"
            sudo mv "$file" "${file}.bak"
        fi
    done
fi

# Update package lists
echo "Updating package lists..."
sudo apt update
