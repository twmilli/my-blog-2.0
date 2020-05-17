---
slug: bourbon-infrastructure
title: Bourbon infrastructure, Cereal, Engineering as an abstraction
date: "2019-12-08"
tag: Thoughts
---

I took a tour of Bardstown Bourbon Company while visiting Kentucky. The bourbon was great. And the tour reminded me that I do actually love thinking about engineering problems in the real-world (and not just on a computer).

<!-- more -->

I took a tour of Bardstown Bourbon Company while visiting Kentucky. The bourbon was great. And the tour reminded me that I do actually love thinking about engineering problems in the real-world (and not just on a computer).

The most interesting part, however, was the business model. In just 3 years they’ve become the 7th largest bourbon distillery in the world. That’s insane. Jim beam was started over 200 years ago. Most famous distilleries were started at least 100 years ago.

How?

They changed the game with a completely different business model.

Other bourbon companies work with Bardstown Bourbon Company to manufacture bourbon in their name. The company has complete creative control over the:

Mash bill (mix of grains used to make the whiskey)

Type of barrel the whiskey is aged in

Temperature of various steps in the process

Over 500+ parameters in the process that impact the flavor.

![Bourbon Tour - Massive Tanks](./tour1.jpg)

This brings me to the other genius part of the business model. As soon as the whiskey is barreled, it becomes the property of the bourbon company Bardstown Bourbon Co is working with.

To add some context: It takes ~72 hours to go from the start of the process —> barrel. Most whiskey is then aged in the barrel for 6-15 years (!). This is what typically makes it so difficult to start a whiskey distillery. You have to purchase millions of dollars worth of equipment, and you cannot even start to recoup this money until ~6 years have passed.

But because Bardstown Bourbon Company is selling barrels, they can start to recoup money almost immediately. Genius.

They’re essentially the AWS equivalent for bourbon. Bardstown can hire the best bourbon process engineers in the world to design a flexible, maintainable, and effective whiskey production process. And both them and everyone they work with benefits.

Companies working with them can focus on the more creative aspects: Branding, and crafting a unique recipe / flavor profile. Meanwhile, Bardstown handles the engineering challenges to keep the flavor consistent and help companies scale.

![Bourbon Tour - Software](./tour2.jpg)

The key insight here is that many products require a large engineering effort, even though this is not part of the value chain or core differentiator for the product.

To make this more concrete let's think about the process of making a cereal. If I had to guess, I would say that the process for manufacturing coco pebbles, looks pretty similar to the process for frosted flakes, looks pretty similar to the process for fruit loops. You mix some ingredients, do some extrusions, heating / cooling, and some packaging. Nothing about the process is differentiated.

But hundreds of hours were spent by chemical engineers designing processes for each of these products. Millions of dollars are spent each year by cereal companies to keep the processes up and running, and to scale up/down appropriately. So much time and energy is put into a part of their product that is not differentiated at all! The differentiated part of cereal lies in the recipe and the branding/marketing.

Now you might be thinking - cereal companies definitely manufacture different cereals on the same process line. This is true. But as far as I know - none of these companies have been bold enough to open up their lines to let other companies make their own recipe. And maybe this is because cereal companies don't want it to become easier for new cereals to pop up. But if Bardstown Bourbon Co proves anything, it's that if you deliver on the promise of handling the "process side" better than anyone else, the money will follow.

![Creativity & Engineering Abstraction](./diagram.png)

Commoditizing the cereal creation process would open the industry to innovation and new products by making it easier to start a cereal company. But I suspect many of the existing players have some massive inefficiencies in their process simply due to being around for so long. It's not their core competency so they don't prioritize process improvements the same way a company that's only handling the process side would. For the same reason that incumbents are switching to cloud services, I believe cereal incumbents might switch at least part of their process to be managed by a 3rd party.

[CloudKitchen](https://www.cloudkitchens.com/) is an exciting company doing this for restaurant creation.

Over time, I believe any process that is not differentiated will be abstracted. This is already happening in some industries - but we are still so far behind where we could be. Maybe it is the human tendency to think that parts of our process are more differentiated than they actually are. Or maybe there are some "laws of physics" that I'm missing that prevent some of these companies from succeeding.
