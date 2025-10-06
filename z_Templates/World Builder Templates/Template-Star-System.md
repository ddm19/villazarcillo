---
tags:
  - Category/StarSystem
obsidianUIMode: preview
MyContainer:
image: "Template_StarSystem_Placeholder.png"
---



<%*
const placeholderPrefix = "NewStarSystem";
let title;

// 1) Prompt only if still using placeholder name
if (tp.file.title.startsWith(placeholderPrefix)) {
  title = await tp.system.prompt("Enter Star System Name");
  if (!title) {
    new Notice("No name entered. Aborting.");
    return;
  }
  await tp.file.rename(title);
} else {
  title = tp.file.title;
}

// 2) Gather Galaxy files from folder
const galaxyFiles = tp.app.vault.getMarkdownFiles()
  .filter(f => f.path.startsWith("2-World/Galaxies/"));

const placeholderLabel = "🌀 No Galaxy Selected";
const placeholderPath = "__placeholder__";

// 3) Prompt to choose Galaxy (or skip)
const galaxyChoices = [placeholderLabel, ...galaxyFiles.map(f => f.basename)];
const galaxyValues = [placeholderPath, ...galaxyFiles.map(f => f.path)];

const chosenPath = await tp.system.suggester(galaxyChoices, galaxyValues, true);
if (!chosenPath) return;

// 4) Build wiki-link if selected
let wikiLink = null;
if (chosenPath !== placeholderPath) {
  const chosenAlias = chosenPath.split("/").pop().replace(/\.md$/, "");
  wikiLink = `[[${chosenPath}|${chosenAlias}]]`;
}

// 5) Write to frontmatter
setTimeout(() => {
  const newFile = tp.file.find_tfile(tp.file.path(true));
  if (!newFile) {
    new Notice("Could not find file after rename.");
    return;
  }
  app.fileManager.processFrontMatter(newFile, fm => {
    fm["MyContainer"] = wikiLink ?? "None";
  });
}, 200);
%>


> [!NOTE] Parent Continent: `INPUT[suggester(optionQuery(#Category/Galaxy)):MyContainer]`

> [!column|no-i no-t]
>> [!info|no-title] Map
>> ![[Template_StarSystem_Placeholder.png]]
>
>> [!note|no-title] Town Name
>> ~~~meta-bind
>> INPUT[select(
>> option(1, ℹ️General Info),
>> option(2, 🌐Star System),
>> option(3, 📝GM Notes),
>> class(tabbed)
>> )]
>> ~~~
>>>[!tabbed-box-maxh]
>>> >[!div-m|no-title]
>>> > ![[#General Info|no-h clean]]
>>>
>>> >[!div-m|no-title]
>>> > ![[#Star System Details|no-h clean]]
>>>
>>> > [!div-m|no-title]
>>> > ![[#GM Notes|no-h clean]]
>>> 

> [!NOTE|no-title]
> ~~~meta-bind
> INPUT[select(
> option(1, 🗺️Planets),
> option(2, 🗺️Points of Interest),
> class(tabbed)
> )]
> ~~~
> >[!tabbed-box]
> > >[!div-m|no-title]
> > > ![[#Planets|no-h clean]]
> >
> > >[!div-m|no-title]
> > > ![[#Points of Interest|no-h clean]]
> >

---
# General Info

This is the star system description. 

# Star System Details

**Dominant Races:**  

# GM Notes

Make notes of what you need to track in the star system here. 

# Planets

`BUTTON[button_planet]` 

```base
properties:
  file.name:
    displayName: Planet Name(s)
  note.MyCategory:
    displayName: Type of Planet
views:
  - type: cards
    name: Planets - Cards
    filters:
      and:
        - file.folder == "2-World/Planets"
        - list(MyContainer).contains(this)
    order:
      - file.name
    image: note.image
  - type: table
    name: Planets - Table
    filters:
      and:
        - file.folder == "2-World/Planets"
        - list(MyContainer).contains(this)
    order:
      - file.name
    sort:
      - property: file.name
        direction: DESC
    columnSize:
      file.name: 182

```

# Points of Interest

`BUTTON[button_pointofinterest]` 

```base
properties:
  file.name:
    displayName: Point of Interest Name(s)
  note.MyCategory:
    displayName: Type of POI
views:
  - type: cards
    name: Point of Interest - Cards
    filters:
      and:
        - file.folder == "2-World/Points of Interest"
        - list(MyContainer).contains(this)
    order:
      - file.name
    image: note.image
  - type: table
    name: Point of Interest - Table
    filters:
      and:
        - file.folder == "2-World/Points of Interest"
        - list(MyContainer).contains(this)
    order:
      - file.name
    sort:
      - property: file.name
        direction: DESC
    columnSize:
      file.name: 182

```