---
tags:
  - Category/StarSystem
obsidianUIMode: preview
MyContainer: "[[Test Galaxy|Test Galaxy]]"
image: Template_StarSystem_Placeholder.png
---






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