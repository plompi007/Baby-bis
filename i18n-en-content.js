'use strict';
// English content for content.js (wisdom notes, recipes, flavor pairings). Applied only in English.

const EN_NOTE_CATS = { allergen: 'Allergens', taste: 'Tasting', safety: 'Safety', nutrition: 'Nutrition', kitchen: 'Kitchen tricks', calm: 'Calm parenting' };

const EN_NOTES = {
  n1: ['Introducing is only half the way', 'Once an allergen is in and tolerated, keep giving it regularly. A one-time taste doesn’t build long-term tolerance.'],
  n2: ['Good morning, new allergen', 'Serve a new allergen in the morning or at midday, on a regular day at home. That leaves several waking hours to watch for a reaction.'],
  n3: ['One at a time', 'One new allergen at a time, and 2–3 days before the next. If there’s a reaction, you’ll know exactly what caused it.'],
  n4: ['Bamba = a measured portion', 'About 21 g of Bamba (roughly half a small bag) contains about 2 g of peanut protein – the portion tested in the LEAP study. Under age 1, dissolve Bamba in water or milk into a porridge.'],
  n5: ['The tahini habit', 'In Israel, sesame allergy is more common than peanut allergy. A teaspoon of raw tahini in purée, yogurt or porridge a few times a week is an easy way to keep it up.'],
  n6: ['Egg – only well cooked', 'Guidelines recommend well-cooked egg (hard-boiled, fully cooked omelet, egg baked into food). Soft or raw egg isn’t right for the introduction stage.'],
  n7: ['Every nut is its own world', 'Almond, cashew, walnut and hazelnut are separate allergens. Introduce each one on its own, then rotate between them for maintenance.'],
  n8: ['Rash around the mouth', 'Redness where food touched (especially tomato, strawberry or citrus) is usually contact irritation, not allergy. If it spreads or other symptoms appear – see a doctor.'],
  n9: ['Eczema? Talk first', 'For a baby with severe eczema, early exposure is especially important. Plan it with your pediatrician – sometimes testing or an in-clinic exposure is done.'],
  n10: ['Blend in, don’t replace', 'Allergens are easy to keep up when they "hide" in regular food: tahini in purée, peanut butter in porridge, egg in patties, yogurt as a sauce.'],
  n11: ['"Yuck" isn’t "no"', 'A scrunched-up face is a natural reaction to a new taste, especially bitter or sour. It doesn’t mean your baby dislikes it. Keep offering.'],
  n12: ['The magic of 10', 'Research shows it sometimes takes 8–10 exposures or more before a food is accepted. Today’s refusal is part of the journey.'],
  n13: ['Green early', 'Offer bitter vegetables like broccoli, spinach and cauliflower early and on their own – not only hidden in sweet fruit. That’s how babies learn to like the taste itself.'],
  n14: ['Same carrot, three experiences', 'Purée, a steamed stick, an oven-roasted carrot. Each way of serving is a new exposure to taste and texture.'],
  n15: ['Spices yes, salt no', 'Cinnamon, cumin, turmeric, sweet paprika, garlic, herbs and lemon add flavor without salt, and get babies used to family cooking.'],
  n16: ['New next to familiar', 'Serve a new food next to one your baby already likes. That way there’s a safe "anchor" on the plate.'],
  n17: ['Touching is tasting', 'Smearing, squeezing and scattering food on the tray are part of learning. Touch and smell count as exposure too, so a little mess is worth it.'],
  n18: ['Move on with texture', 'Don’t stay on smooth purée for too long. Gradually moving to coarser textures and finger foods by 9–10 months helps chewing develop and reduces picky eating.'],
  n19: ['Gagging ≠ choking', 'Gagging is noisy, with coughing and faces – a normal protective reflex. Choking is silent. When gagging, let your baby work it out and don’t put a finger in their mouth.'],
  n20: ['Round and firm = cut it', 'Cut grapes and cherry tomatoes lengthwise into quarters. Squash blueberries. Cut hot dogs lengthwise, not into rounds.'],
  n21: ['The squish test', 'Finger food should squash easily between your thumb and index finger. If it doesn’t, cook it longer.'],
  n22: ['No honey before 1', 'Honey can contain botulism spores, even after baking. Wait until the first birthday.'],
  n23: ['Eat only sitting down', 'Eat in a high chair, sitting upright and supervised. Not while walking, not in the car and not lying down.'],
  n24: ['Spread it thin', 'Thick peanut butter or tahini off a spoon can stick to the palate. Thin with warm water or spread a very thin layer on toast.'],
  n25: ['First-aid course', 'A baby CPR and first-aid course is one of the best investments for parents – and takes a lot of stress out of mealtimes.'],
  n26: ['Iron every day', 'From 6 months iron stores drop. Offer iron-rich food once or twice a day: beef, chicken, egg, lentils, legumes.'],
  n27: ['Vitamin C helps iron', 'Lentils with red pepper, porridge with strawberries, a beef patty with tomato. Vitamin C improves iron absorption.'],
  n28: ['Fat is good', 'Babies need lots of fat for brain development. Avocado, olive oil, tahini, nut butters and oily fish.'],
  n29: ['Water in an open cup', 'From 6 months offer sips of water in an open cup or straw cup at meals. Good motor practice too.'],
  n30: ['Vary your grains', 'Rice may contain arsenic. Rotate between oats, buckwheat, quinoa, semolina, ptitim and bulgur.'],
  n31: ['Milk is still central', 'Until age 1, breast milk or formula is the main source of nutrition. If your baby ate little today, that’s fine. Look at the week, not the day.'],
  n32: ['Constipation? Prunes, pears and water', 'Plums, pears, peaches and oats, together with water, help digestion. Lots of banana and rice may slow it down.'],
  n33: ['Golden ice cubes', 'Cook a pot of purée and freeze it in an ice-cube tray. Each cube is a small portion, and you can combine them (sweet potato + lentils + tahini).'],
  n34: ['A portion from the family pot', 'Take your baby’s portion out before adding salt and spice. They eat what everyone eats, and you skip cooking twice.'],
  n35: ['Bamba melts into porridge', 'Stir a few Bamba sticks with a little boiling water or breast milk and wait a minute. You get a smooth, safe peanut porridge.'],
  n36: ['A jar of ground nuts', 'Grind almonds and nuts into a fine powder and keep it in the fridge. A teaspoon into porridge, yogurt or muffins keeps nut exposure going effortlessly.'],
  n37: ['Freezer patties', 'Soft patties (beef/chicken/fish + vegetable + egg) freeze beautifully. Warm for a few minutes and you have a meal with iron and egg exposure.'],
  n38: ['One preloaded spoon', 'Place a filled spoon on the tray so your baby can pick it up alone. It encourages independence and reduces battles.'],
  n39: ['You decide what, they decide how much', 'With the division of responsibility, the parent chooses what, when and where, and the baby decides whether and how much. It takes a lot of pressure off both sides.'],
  n40: ['No "just one more spoon"', 'Pressure, bribes or "airplane" games can increase refusal over time. Turning away or a closed mouth means "I’m done" – respect it.'],
  n41: ['Eat together', 'Babies learn by imitation. Sit and eat with them, taste the same food, and show you enjoy it.'],
  n42: ['A bad day is just a day', 'Teeth, illness, a growth spurt – some days they barely eat. Look at the week, not the meal.'],
  n43: ['No screens at meals', 'A screen-free meal helps your baby listen to hunger and fullness cues, and helps you see how they react.'],
  n44: ['Mess = learning', 'A big bib, a mat under the chair and a deep breath. The mess is part of the fun and of development.'],
};

// [a, b, note] – the food emoji at the start of "a" is kept
const EN_COMBOS = [
  ['Sweet potato', 'Cinnamon', 'Sweet and warm'], ['Peas', 'Mint', 'Fresh'], ['Carrot', 'Cumin', 'Middle-Eastern aroma'],
  ['Apple', 'Cinnamon', 'Classic'], ['Avocado', 'A drop of lemon', 'Keeps the color'], ['Lentils', 'Turmeric + red pepper', 'Iron + vitamin C'],
  ['Banana', 'Tahini', 'Sesame maintenance'], ['Yogurt', 'Mashed blueberries', 'Pink and happy'], ['Broccoli', 'Grated cheese', 'Softens bitterness'],
  ['Spinach', 'Potato', 'Green in disguise'], ['Chicken', 'Cooked prunes', 'Sweet-savory, no salt'], ['Pumpkin', 'A pinch of ginger', 'Warming'],
  ['Porridge', 'Ground nuts + pear', 'Nut maintenance'], ['Roasted eggplant', 'Tahini + lemon', 'Baby baba ganoush'], ['White fish', 'Dill + lemon', 'Delicate'],
  ['Beef', 'Tomato + sweet paprika', 'Iron + vitamin C'], ['Persimmon', 'Cinnamon', 'Sweet like dessert'], ['Butternut', 'Ginger', 'Warm and gentle'],
  ['Apricot', 'Yogurt', 'Summery and fresh'], ['Salmon', 'Dill + yogurt', 'Soft sauce'], ['Polenta', 'Grated cheese', 'Creamy comfort'],
  ['Pineapple', 'Mint', 'Tropical and cool'], ['Kohlrabi', 'Apple', 'Sweet and fresh'], ['Pita', "Za'atar + olive oil", 'Israeli classic'],
];

// [name, extras[], steps[], tip]
const EN_RECIPES = {
  r1: ['Sweet potato & tahini mash', ['A pinch of cinnamon (optional)'], ['Bake or boil a sweet potato until very soft.', 'Mash with a fork or blender, thinning with water or breast milk as needed.', 'Stir in ¼–1 teaspoon of raw tahini, depending on the stage.'], 'Great for a first sesame exposure. Freeze in cubes without the tahini and add it fresh.'],
  r2: ['Bamba porridge', ['Boiling water / breast milk / formula'], ['Put a few Bamba sticks in a bowl.', 'Pour a little warm liquid over and wait a minute.', 'Mash until smooth and let cool.'], 'The full maintenance portion is about 21 g of Bamba (≈2 g peanut protein), 3 times a week.'],
  r3: ['Oat, banana & peanut butter porridge', ['Water / breast milk / formula'], ['Cook fine oats in liquid for about 5 minutes.', 'Mash in half a ripe banana.', 'Stir in smooth peanut butter until fully melted.'], 'The banana sweetens it, so no sugar is needed.'],
  r4: ['Red lentil, carrot & pumpkin purée', ['A pinch of cumin', 'A teaspoon of olive oil'], ['Rinse half a cup of red lentils.', 'Cook with chopped carrot, pumpkin and water for about 20 minutes.', 'Blend with olive oil and a pinch of cumin.'], 'Add a vitamin-C fruit (strawberry, kiwi) to improve iron absorption.'],
  r5: ['Mashed avocado & banana', [], ['Mash a quarter of a ripe avocado and half a banana.', 'Serve right away.'], 'Add a teaspoon of yogurt for milk exposure too.'],
  r6: ['Semolina porridge with pear', ['Water / breast milk / formula'], ['Boil half a cup of liquid and sprinkle in 1–2 tablespoons of semolina while stirring.', 'Cook for 3 minutes until thick.', 'Add steamed, mashed pear.'], 'A gentle way to introduce wheat.'],
  r7: ['Yogurt with tahini & strawberry', [], ['Mix 3 tablespoons of plain yogurt with a teaspoon of tahini.', 'Add mashed or finely chopped strawberry.'], 'One meal that maintains two allergens, milk and sesame. Only after each has been introduced separately.'],
  r8: ['Porridge with ground walnuts & apple', ['Cinnamon'], ['Cook oat porridge.', 'Add grated, cooked apple and a pinch of cinnamon.', 'Sprinkle in half a teaspoon of walnuts ground to a fine powder and mix.'], 'Each nut is a separate allergen: make the same porridge with another nut that’s already introduced (almond, hazelnut, pecan) to maintain it too.'],
  r9: ['Banana-egg pancakes', ['A little oil for frying'], ['Mash a ripe banana and mix with an egg and 2 tablespoons of ground oats.', 'Pour small rounds into an oiled pan over medium heat.', 'Flip and make sure they’re fully cooked inside.'], 'Cut into strips to hold. Freezes well.'],
  r10: ['Sweet potato & egg muffins', ['A teaspoon of baking powder', 'Olive oil', 'Cinnamon'], ['Mix a cup of mashed sweet potato, 2 eggs, a cup of ground oats, 2 tablespoons of oil and cinnamon.', 'Fill a mini-muffin tin.', 'Bake at 180°C (350°F) for 18–20 minutes, until a toothpick comes out clean.'], 'Add a teaspoon of tahini or peanut butter to the batter for another allergen.'],
  r11: ['Soft beef & lentil patties', ['Grated onion', 'Parsley'], ['Mix 250 g ground beef, half a cup of cooked red lentils, grated carrot, an egg and onion.', 'Shape into fingers or small patties.', 'Bake at 180°C (350°F) for about 20 minutes, or simmer in tomato sauce.'], 'An iron-rich meal that also maintains egg exposure.'],
  r12: ['Salmon with potato & broccoli mash', ['Olive oil', 'Lemon'], ['Bake a salmon fillet for about 15 minutes and flake it (check for bones!).', 'Cook potato and broccoli until soft.', 'Mash together with olive oil and a drop of lemon.'], 'Great for a first introduction to fish.'],
  r13: ['Salmon & sweet potato patties', ['Dill'], ['Mix flaked cooked salmon, mashed sweet potato, an egg and chopped dill.', 'Shape into flat patties.', 'Bake at 190°C (375°F) for about 15 minutes, flipping halfway.'], 'Two allergens in one patty: fish and egg. Only after each has been introduced separately.'],
  r14: ['Ptitim with chicken & vegetables', ['Onion', 'Turmeric'], ['Cook finely chopped chicken with onion, carrot and zucchini.', 'Add ptitim, water and a pinch of turmeric, and cook until everything is very soft.', 'Mash lightly depending on the stage.'], 'Take the baby’s portion from the family pot before adding salt.'],
  r15: ['Pink pasta with white cheese', ['Garlic', 'Basil', 'Olive oil'], ['Cook pasta (large shapes like fusilli) until very soft.', 'Simmer crushed tomatoes with garlic and olive oil for about 10 minutes.', 'Stir in a tablespoon of soft white cheese and basil.'], 'Large shapes are easy to hold.'],
  r16: ['Baked veggie omelet', [], ['Whisk 2 eggs with chopped spinach, grated zucchini and grated cheese.', 'Pour into a small oiled dish.', 'Bake at 180°C (350°F) for about 15 minutes, until fully set.'], 'Cut into fingers. Keeps for two days in the fridge.'],
  r17: ['Chicken liver & apple spread', ['Olive oil'], ['Sauté onion until soft, add chicken livers and cook until fully done.', 'Add cooked apple.', 'Blend into a smooth spread.'], 'A teaspoon once or twice a week is enough – liver is very high in vitamin A. Spread on toast.'],
  r18: ['Baked tofu fingers', ['Olive oil', 'Sweet paprika'], ['Cut firm tofu into fingers.', 'Brush with olive oil and paprika.', 'Bake at 200°C (400°F) for about 20 minutes.'], 'Protein and calcium that also maintain soy exposure.'],
  r19: ['Peanut butter & banana toast', [], ['Lightly toast a slice of bread.', 'Spread a very thin layer of peanut butter.', 'Mash banana on top and cut into strips.'], 'One toast maintains both peanut and wheat.'],
  r20: ['Baby shakshuka', ['Garlic', 'Sweet paprika'], ['Simmer onion and pepper with crushed tomatoes for about 15 minutes.', 'Crack in an egg and stir.', 'Cook until the egg is fully done, with no runny yolk.'], 'Cook for the whole family and take the baby’s portion out before adding salt and heat.'],
  r21: ['Quinoa with peas & chicken', ['Lemon', 'Mint'], ['Cook rinsed quinoa until very soft.', 'Add cooked, mashed peas and finely shredded chicken.', 'Season with a drop of lemon and chopped mint.'], 'Peas and mint are a classic pair.'],
  r22: ['Soft date & almond balls', ['A little water'], ['Soak pitted dates in hot water for 10 minutes.', 'Blend in a food processor with ground almonds and oats into a soft paste.', 'Shape into small balls and flatten slightly.'], 'Squeeze each ball between your fingers to make sure it’s soft. Serve under supervision.'],
  r23: ['Cheesy broccoli & cauliflower', [], ['Steam broccoli and cauliflower florets until soft.', 'Sprinkle with a little grated cheese.', 'Bake for 5 minutes until the cheese melts.'], 'The stalk is a natural handle.'],
  r24: ['Yogurt-mango teething pops', [], ['Blend ripe mango with plain yogurt.', 'Pour into small popsicle molds or a mesh feeder.', 'Freeze for 3 hours.'], 'Cools and soothes sore gums.'],
  r25: ['Homemade salt-free hummus', ['Cooked chickpeas', 'Raw tahini', 'Lemon', 'Olive oil'], ['Blend a cup of soft cooked chickpeas with 2 tablespoons of tahini, lemon juice and a little water.', 'Add olive oil.', 'Serve with pita strips or steamed vegetables for dipping.'], 'Store-bought hummus is very salty. At home you control the amount.'],
  r26: ['Soft French toast', ['Cinnamon'], ['Whisk an egg with 2 tablespoons of yogurt and cinnamon.', 'Dip strips of bread.', 'Fry until fully cooked on both sides.'], 'Three allergens in one meal: wheat, egg and milk. Only after each has been introduced.'],
  r27: ['Beet & apple purée', [], ['Cook beet until very soft (about 40 minutes).', 'Steam a peeled apple.', 'Blend together.'], 'The pink-purple color shows up in the diaper too. That’s normal!'],
  r28: ['Pasta in cashew-pumpkin sauce', ['Garlic', 'Olive oil'], ['Blend roasted pumpkin with a tablespoon of cashew butter, garlic and a little water into a creamy sauce.', 'Toss with soft-cooked pasta.'], 'A "cream" sauce without cream that maintains cashew exposure. Note: cashew and pistachio are related, but each needs its own exposure.'],
  r29: ['Butternut & ginger purée', [], ['Bake butternut halves at 200°C (400°F) for about 30 minutes until soft.', 'Scoop out the flesh and blend with a teaspoon of olive oil.', 'Grate in a pinch of fresh ginger.'], 'Ginger adds gentle warmth. Start with a very small pinch.'],
  r30: ['Millet & apricot porridge', ['Water / breast milk / formula'], ['Cook a quarter cup of rinsed millet in a cup of water for about 15 minutes, until very soft.', 'Add a ripe, peeled, mashed apricot.', 'Blend with a pinch of cinnamon and thin as needed.'], 'Millet is a gluten-free grain, easy on the tummy.'],
  r31: ['Ricotta with fig', [], ['Mash a ripe fig.', 'Mix with 2 tablespoons of ricotta.'], 'Naturally sweet and mild, and keeps up milk exposure.'],
  r32: ['Persimmon & yogurt mash', [], ['Peel a soft, ripe persimmon and mash it.', 'Stir in 2–3 tablespoons of plain yogurt.'], 'A ripe persimmon is as soft as jam – no cooking needed.'],
  r33: ['Papaya & coconut cream', ['Coconut milk'], ['Mash ripe, seeded papaya.', 'Stir in a tablespoon of coconut milk.'], 'Coconut usually isn’t considered a nut for allergy purposes.'],
  r34: ['Kefir, raspberry & banana', [], ['Blend half a banana, a handful of raspberries and 3 tablespoons of kefir.', 'Serve with a spoon or in a small open cup for practice.'], 'Also works as a teething pop.'],
  r35: ['Vegetable couscous with turmeric', ['Onion'], ['Cook zucchini, carrot and onion in water with a pinch of turmeric until fully soft.', 'Prepare couscous with a little of the hot broth.', 'Mix and mash lightly.'], 'Turmeric stains yellow – a bib is a good idea! 😄'],
  r36: ['Barley, leek & celery soup', ['Olive oil'], ['Sauté chopped leek and celery in olive oil.', 'Add carrot, half a cup of rinsed pearl barley and 5 cups of water.', 'Cook for about an hour until the barley is very soft, and mash the baby’s portion.'], 'Take the baby’s portion out before adding salt.'],
  r37: ['Mung beans & rice (gentle mujadara)', ['Olive oil'], ['Cook half a cup of mung beans for about 20 minutes.', 'Add a quarter cup of rice, a pinch of cumin and water, and cook until everything is very soft.', 'Mix with soft fried onion and mash.'], 'Serve with tomato slices (vitamin C) to improve iron absorption.'],
  r38: ['Green beans with garlic & olive oil', [], ['Steam green beans until very soft (they squash between your fingers).', 'Warm olive oil with a finely crushed garlic clove.', 'Toss the beans in the oil.'], 'Whole green beans are easy for little hands to hold.'],
  r39: ['Lamb, parsley & cumin patties', ['Grated onion', 'Breadcrumbs or oats'], ['Mix 250 g ground lamb, chopped parsley, grated onion, a pinch of cumin and an egg.', 'Shape into small flat patties.', 'Bake at 190°C (375°F) for about 18 minutes.'], 'Lamb is rich in iron and zinc.'],
  r40: ['Tuna & avocado spread', [], ['Mash a quarter avocado with 2 tablespoons of drained light tuna in water.', 'Add a drop of lemon.', 'Spread on toast or serve with a spoon.'], 'Tuna at most once a week because of mercury. Salmon and sardines are safer for frequent use.'],
  r41: ['Sardine & lemon toast', [], ['Mash sardines (the soft bones are edible) with a drop of lemon.', 'Spread on lightly toasted bread.', 'Cut into strips.'], 'An excellent source of omega-3 and calcium.'],
  r42: ['Baked sea bream with dill & polenta', ['Lemon', 'Olive oil'], ['Bake a sea bream fillet with dill, lemon and olive oil for about 15 minutes.', 'Cook soft polenta.', 'Flake the fish (check for bones!) and serve next to the polenta.'], 'Firm polenta cut into fingers is great for self-feeding.'],
  r43: ["Pita with za'atar & olive oil", [], ["Brush pita with olive oil and sprinkle a little salt-free za'atar.", 'Toast in the oven for 5 minutes.', 'Cut into soft strips.'], "Za'atar contains sesame. Serve only after sesame has been introduced."],
  r44: ['Okra & chicken in tomato sauce', ['Lemon'], ['Sauté garlic with crushed tomatoes.', 'Add chopped chicken and okra, and cook for about 40 minutes until everything is very soft.', 'Finish with a drop of lemon and finely chop the baby’s portion.'], 'Well-cooked okra softens and becomes pleasant to chew.'],
  r45: ['Steamed cabbage with rice & beef', ['Onion', 'Sweet paprika'], ['Fry onion and ground beef.', 'Add finely chopped cabbage, rice, crushed tomatoes and water.', 'Cook for about 35 minutes until everything is very soft – "deconstructed stuffed cabbage" for babies.'], 'All the flavor of the family’s stuffed cabbage, with none of the effort.'],
  r46: ['Swiss chard & goat cheese bake', ['Onion'], ['Steam chard leaves and onion and chop finely.', 'Mix with 2 eggs and 50 g of goat cheese.', 'Bake in a small dish at 180°C (350°F) for about 25 minutes, until fully set.'], 'Only after egg and milk have been introduced.'],
  r47: ['Polenta with mozzarella & spinach', [], ['Cook soft polenta.', 'Stir in very finely chopped spinach and a little grated mozzarella until melted.'], 'You can pour it into a dish, chill and cut into fingers.'],
  r48: ['Kohlrabi & potato mash', [], ['Cook chopped kohlrabi and potato until fully soft.', 'Mash with a little butter.'], 'Kohlrabi adds a gentle sweetness, like mild cabbage.'],
  r49: ['Roasted fennel with chicken & lemon', ['Olive oil'], ['Cut fennel into wedges and place in a dish with chicken drumsticks, lemon and olive oil.', 'Roast at 190°C (375°F) for about 40 minutes, until the fennel is very soft.', 'Shred the chicken and serve next to the fennel.'], 'Roasting softens fennel’s anise flavor.'],
  r50: ['Asparagus omelet', ['Olive oil'], ['Steam asparagus tips until soft.', 'Whisk an egg and pour over them in a pan.', 'Cook until the omelet is fully done and cut into strips.'], 'Asparagus tips are a natural handle.'],
  r51: ['Roasted nectarine with almond butter', ['Cinnamon'], ['Roast nectarine halves with cinnamon for about 15 minutes.', 'Mash and mix with yogurt.', 'Stir in half a teaspoon of thinned almond butter.'], 'A dessert that maintains almond and milk.'],
  r52: ['Banana & pecan muffins', ['Baking powder', 'Oil'], ['Mash 2 bananas and mix with an egg, a cup of ground oats, 2 tablespoons of finely ground pecans and a teaspoon of baking powder.', 'Fill a mini-muffin tin.', 'Bake at 180°C (350°F) for about 18 minutes.'], 'The pecans must be ground to a powder. You can swap in another nut that’s already introduced.'],
  r53: ['Pine nut & basil pesto', ['Garlic'], ['Blend basil, a tablespoon of toasted pine nuts, a little grated cheese, garlic and olive oil.', 'Toss with soft-cooked pasta.'], 'Pine nut is off by default in the app. Turn it on in settings to track it.'],
  r54: ['Mashed tropical fruit salad', [], ['Mash ripe mango.', 'Add very ripe pineapple and seedless guava, very finely chopped.'], 'Pineapple may cause redness around the mouth. Usually it’s irritation, not allergy.'],
};

function applyEnglishContent() {
  NOTE_CATS.forEach((c) => { if (EN_NOTE_CATS[c.id]) c.name = EN_NOTE_CATS[c.id]; });
  NOTES.forEach((n) => { const e = EN_NOTES[n.id]; if (e) { n.title = e[0]; n.text = e[1]; } });
  COMBOS.forEach((c, i) => {
    const e = EN_COMBOS[i]; if (!e) return;
    const icon = (c.a.match(/^\S+/) || [''])[0];
    c.a = `${icon} ${e[0]}`; c.b = e[1]; c.note = e[2];
  });
  RECIPES.forEach((r) => {
    const e = EN_RECIPES[r.id]; if (!e) return;
    r.name = e[0]; r.extras = e[1]; r.steps = e[2]; r.tip = e[3];
  });
}

if (IS_EN) { applyEnglishData(); applyEnglishContent(); }
