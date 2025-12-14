# 📚 Documentation Index

All documentation files are in your project! Here's where to find them:

## 📂 Project Structure

```
/Users/venkatarishikraavi/apps/deals-app/
│
├── 📖 Main Documentation (Root Directory)
│   ├── README.md                          ⭐ Start here - Project overview
│   ├── START.md                          🚀 Quick start guide
│   ├── SETUP.md                          ⚙️  Detailed setup instructions
│   ├── SUMMARY.md                        📋 What was built
│   ├── CHECKLIST.md                      ✅ Setup verification
│   ├── ARCHITECTURE.md                   🏗️  System architecture
│   │
│   ├── 🧠 Scoring Algorithm Docs
│   ├── SCORING_ALGORITHM.md              📊 Full algorithm explanation
│   ├── SCORING_QUICK_REFERENCE.md        🎯 Quick lookup card
│   ├── TESTING_SCORING.md                🧪 How to test scoring
│   ├── TEST_RESULTS.md                   ✅ Test results & analysis
│   ├── UPGRADE_TO_ENHANCED_SCORING.md    ⬆️  Migration guide
│   │
│   └── 🔧 Setup Helpers
│       ├── INSTALL_POSTGRES.md           🐘 PostgreSQL installation
│       └── DOCUMENTATION_INDEX.md        📚 This file
│
├── backend/
│   ├── README.md                         📡 API documentation
│   └── src/
│       ├── test-scoring.ts               🧪 Test script
│       └── utils/scoring.ts              🧮 Scoring algorithm code
│
└── frontend/
    └── README.md                         🎨 Frontend docs
```

---

## 🎯 Quick Access Guide

### Just Starting?
1. **[START.md](START.md)** - Quick start (you're already running!)
2. **[README.md](README.md)** - Full project overview
3. **[SETUP.md](SETUP.md)** - Detailed setup guide

### Understanding the Scoring System?
1. **[SCORING_ALGORITHM.md](SCORING_ALGORITHM.md)** - Complete algorithm
2. **[SCORING_QUICK_REFERENCE.md](SCORING_QUICK_REFERENCE.md)** - Quick reference
3. **[TESTING_SCORING.md](TESTING_SCORING.md)** - How to test
4. **[TEST_RESULTS.md](TEST_RESULTS.md)** - Test results

### Want to Migrate Database?
1. **[UPGRADE_TO_ENHANCED_SCORING.md](UPGRADE_TO_ENHANCED_SCORING.md)** - Migration guide

### Technical Details?
1. **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture
2. **[backend/README.md](backend/README.md)** - API docs

---

## 📍 How to Open Files

### Option 1: VS Code (Easiest)

**From your current VS Code window:**
1. Press `Cmd + P` (Mac) or `Ctrl + P` (Windows/Linux)
2. Type the filename (e.g., `SCORING_ALGORITHM.md`)
3. Press Enter

**Or click these paths in VS Code:**
- [SCORING_ALGORITHM.md](SCORING_ALGORITHM.md)
- [TEST_RESULTS.md](TEST_RESULTS.md)
- [TESTING_SCORING.md](TESTING_SCORING.md)

### Option 2: Terminal

```bash
# Navigate to project root
cd /Users/venkatarishikraavi/apps/deals-app

# View in terminal (with formatting)
cat SCORING_ALGORITHM.md

# Or open in VS Code
code SCORING_ALGORITHM.md

# Or open multiple files
code SCORING_*.md
```

### Option 3: macOS Finder

1. Open Finder
2. Press `Cmd + Shift + G`
3. Paste: `/Users/venkatarishikraavi/apps/deals-app`
4. Press Enter
5. All `.md` files are there!

---

## 📖 Documentation by Topic

### 🚀 Getting Started

| File | Purpose | When to Read |
|------|---------|--------------|
| [START.md](START.md) | Quick start guide | First time setup |
| [README.md](README.md) | Project overview | Understanding the project |
| [SETUP.md](SETUP.md) | Detailed setup | Troubleshooting setup |
| [INSTALL_POSTGRES.md](INSTALL_POSTGRES.md) | PostgreSQL install | Need database |

### 🧠 Scoring Algorithm

| File | Purpose | When to Read |
|------|---------|--------------|
| [SCORING_ALGORITHM.md](SCORING_ALGORITHM.md) | Full algorithm docs | Understanding scoring |
| [SCORING_QUICK_REFERENCE.md](SCORING_QUICK_REFERENCE.md) | Quick lookup | Need formula reference |
| [TESTING_SCORING.md](TESTING_SCORING.md) | Testing guide | Want to test scoring |
| [TEST_RESULTS.md](TEST_RESULTS.md) | Test results | See proof it works |
| [UPGRADE_TO_ENHANCED_SCORING.md](UPGRADE_TO_ENHANCED_SCORING.md) | Migration guide | Ready to migrate DB |

### 🏗️ Architecture

| File | Purpose | When to Read |
|------|---------|--------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design | Understanding architecture |
| [backend/README.md](backend/README.md) | API docs | Working with API |
| [SUMMARY.md](SUMMARY.md) | What was built | Quick overview |

### ✅ Verification

| File | Purpose | When to Read |
|------|---------|--------------|
| [CHECKLIST.md](CHECKLIST.md) | Setup checklist | Verify everything works |

---

## 🎨 Best Way to Read

### Recommended Reading Order:

**For Quick Start:**
1. [START.md](START.md) - 5 min
2. [SCORING_QUICK_REFERENCE.md](SCORING_QUICK_REFERENCE.md) - 2 min

**For Deep Dive:**
1. [README.md](README.md) - 10 min
2. [ARCHITECTURE.md](ARCHITECTURE.md) - 15 min
3. [SCORING_ALGORITHM.md](SCORING_ALGORITHM.md) - 20 min
4. [TESTING_SCORING.md](TESTING_SCORING.md) - 10 min

**For Implementation:**
1. [UPGRADE_TO_ENHANCED_SCORING.md](UPGRADE_TO_ENHANCED_SCORING.md) - 30 min
2. [backend/README.md](backend/README.md) - 15 min

---

## 🔍 Search for Specific Topics

Use your code editor's search:

**VS Code:**
- Press `Cmd + Shift + F` (Mac) or `Ctrl + Shift + F` (Windows)
- Search across all `.md` files

**Examples:**
- Search: `vote weight` → Find all voting weight info
- Search: `frontpage` → Find frontpage qualification details
- Search: `price truth` → Find pricing algorithm details

---

## 💡 Pro Tips

### 1. **Pin Important Files**
In VS Code, right-click any file → "Pin Tab"

Suggested pins:
- SCORING_QUICK_REFERENCE.md (for formulas)
- TESTING_SCORING.md (for testing)
- README.md (for overview)

### 2. **Use Markdown Preview**
In VS Code:
- Open any `.md` file
- Press `Cmd + Shift + V` (Mac) or `Ctrl + Shift + V` (Windows)
- See formatted view with links!

### 3. **Create Shortcuts**

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# Alias to jump to docs
alias docs='cd /Users/venkatarishikraavi/apps/deals-app && code DOCUMENTATION_INDEX.md'

# Alias to view specific doc
alias scoring='code /Users/venkatarishikraavi/apps/deals-app/SCORING_ALGORITHM.md'
```

---

## 📱 Quick Access Commands

```bash
# Open all scoring docs
cd /Users/venkatarishikraavi/apps/deals-app
code SCORING_*.md

# Open main docs
code README.md START.md SETUP.md

# Open everything
code *.md

# Search in all docs
grep -r "vote weight" *.md

# List all docs with descriptions
ls -1 *.md
```

---

## 🌟 Most Important Files (Top 5)

If you only read 5 files, read these:

1. **[SCORING_ALGORITHM.md](SCORING_ALGORITHM.md)** - The core algorithm
2. **[TESTING_SCORING.md](TESTING_SCORING.md)** - How to test it
3. **[SCORING_QUICK_REFERENCE.md](SCORING_QUICK_REFERENCE.md)** - Quick formulas
4. **[README.md](README.md)** - Project overview
5. **[ARCHITECTURE.md](ARCHITECTURE.md)** - How it all works

---

## 📂 File Locations

**All documentation is in:**
```
/Users/venkatarishikraavi/apps/deals-app/
```

**Scoring-related docs:**
```
/Users/venkatarishikraavi/apps/deals-app/SCORING_*.md
```

**Test script:**
```
/Users/venkatarishikraavi/apps/deals-app/backend/src/test-scoring.ts
```

**Scoring algorithm code:**
```
/Users/venkatarishikraavi/apps/deals-app/backend/src/utils/scoring.ts
```

---

## 🆘 Can't Find a File?

Run this command:

```bash
cd /Users/venkatarishikraavi/apps/deals-app
ls -lh *.md
```

Or search:

```bash
find /Users/venkatarishikraavi/apps/deals-app -name "*.md" -type f
```

---

## 📨 Quick Reference Links

Open directly in VS Code (if you're in the project):

- Main Docs: `code README.md`
- Scoring: `code SCORING_ALGORITHM.md`
- Testing: `code TESTING_SCORING.md`
- Quick Ref: `code SCORING_QUICK_REFERENCE.md`
- Setup: `code SETUP.md`

---

**All files are in your project root!** Just press `Cmd + P` in VS Code and type the filename. 🚀
