# Telegram ExpenseBot Example
This will setup the LexBot that is called from the Telegram Bot.

#### 1. Create a Lex bot
Use the Lex Console to create a bot named `expensy_bot`.

In the settings tab. Create a new Alias Name called `Beta`.

The next steps is to create 4 new intents: `GetExpenseReport`, `Help`, `Welcome` and `recordReceipt`.

#### 2. Create the intent `GetExpenseReport`
Create a new intent `GetExpenseReport` in the Lex bot.

##### 2A. Configure Slots for intent `GetExpenseReport`
Configure a slot `Country` with built-in type `AMAZON.DATE` in the intent with the prompt `For which period?`

##### 2B. Configure sample utterances for intent `GetExpenseReport`
Add the following sample utterances to the intent:
* Do you have my report from ​{period}​
* Do you have my report
* Do you have my expenses from ​{period}​
* Do you have my expenses
* Do you have my expense report from ​{period}​
* Do you have my expense report
* Can you send me my report from ​{period}​
* Please send me my expense report
* Please send me my report
* Can you get me my expense report

##### 2C. Lambda initialization and validation for intent `GetExpenseReport`
Leave the checkbox `Initialization and validation code hook` unchecked.

##### 2D. Confirmation prompt for intent `GetExpenseReport`
Leave the checkbox `Confirmation prompt` unchecked.

##### 2E. Fulfillment for intent `GetExpenseReport`
Click the radio button to `Return parameters to client`.

##### 2F. Response for intent `GetExpenseReport`
Add the following responses to the intent:
* Ok. I'm producing the report right now.
* Okidoki. The report is being generated right now.

#### 3. Create the intent `Help`
Create a new intent `Help` in the Lex bot.

##### 3A. Configure Slots for intent `Help`
No slots created for this intent

##### 3B. Configure sample utterances for intent `Help`
No sample utterances created for this intent

##### 3C. Lambda initialization and validation for intent `Help`
Leave the checkbox `Initialization and validation code hook` unchecked.

##### 3D. Confirmation prompt for intent `Help`
Leave the checkbox `Confirmation prompt` unchecked.

##### 3E. Fulfillment for intent `Help`
Click the radio button to `Return parameters to client`.

##### 3F. Response for intent `Help`
Add the following responses to the intent:
* Just upload a receipt and picture and the work is done.

#### 4. Create the intent `Welcome`
Create a new intent `Help` in the Lex bot.

##### 4A. Configure Slots for intent `Welcome`
No slots created for this intent

##### 4B. Configure sample utterances for intent `Welcome`
Add the following sample utterances to the intent:
* Howdy
* Hi
* Hello

##### 4C. Lambda initialization and validation for intent `Welcome`
Leave the checkbox `Initialization and validation code hook` unchecked.

##### 4D. Confirmation prompt for intent `Welcome`
Leave the checkbox `Confirmation prompt` unchecked.

##### 4E. Fulfillment for intent `Welcome`
Click the radio button to `Return parameters to client`.

##### 4F. Response for intent `Welcome`
Add the following responses to the intent:
* Welcome to the Expsense Bot. If you need help. Enter help.

#### 5. Create the intent `recordReceipt`
Create a new intent `recordReceipt` in the Lex bot.

##### 5A. Configure Slots for intent `recordReceipt`
Configure the following custom slots:
| currencyType | Slot Resolution | Value |
| -------------| --------------- | ----- |
| receiptType | Restrict to Slot values and Synonyms | chf (Swiss Franc, CHF), eur (euro, EUR, EURO), usd (US Dollar, Dollar, USD) |
| merchantType | Restrict to Slot values and Synonyms | socar, kukku, statoil, san diego, coop, esso, shell, autogrill, bp, movenpick |
| receiptType | Restrict to Slot values and Synonyms | petrolstation (gas station, gasoline station), restaurant (bar, cafeteria, coffee shop, diner) |

And Configure the following slots:
| Required | Name           | Slot type   | Prompt |
| ---------| -------------- | ---------   | ------ |
| yes | receiptType | receiptType | What type of receipt? Is restaurant or petrol station |
| yes | merchantType | merchantType | From which retailer/restaurant? |
| yes | ​amountType | AMAZON.NUMBER | The total amount? |
| yes | ​amountCurrency | currencyType | Which currency? |
| yes | ​receiptdateType | AMAZON.DATE | When? |

##### 5B. Configure sample utterances for intent `GetExpenseReport`
Add the following sample utterances to the intent:
* Claim currency ​{amountCurrency}​ for ​{receiptType}​ at ​{merchantType}​ on ​{receiptdateType}​
* Claim cost ​{amountType}​ for ​{receiptType}​ at ​{merchantType}​ on ​{receiptdateType}​
* Claim for ​{receiptType}​ at ​{merchantType}​ on ​{receiptdateType}​
* I want to do a expense claim
* Spend ​{amountCurrency}​ ​{amountType}​ on ​{receiptType}​ with a client ​{receiptdateType}​
* Spend ​{amountCurrency}​ ​{amountType}​ for ​{receiptType}​ at ​{merchantType}​ on ​{receiptdateType}​
* I want to claim an expense of ​{amountType}​ ​{amountCurrency}​
* I want to claim an expense of ​{amountCurrency}​ ​{amountType}​
* I had an expense claim from ​{receiptdateType}​
* I have an expense claim from ​{receiptdateType}​
* Please record my expense claim
* expense claim
* I want to claim my ​{receiptType}​ from ​{receiptdateType}​
* I want to claim an expense.

##### 5C. Lambda initialization and validation for intent `GetExpenseReport`
Tick the checkbox `Initialization and validation code hook` and the lambda function `expensy_bot-dev-expensybot-init`.

##### 5D. Confirmation prompt for intent `GetExpenseReport`
Tick the checkbox `Confirmation prompt`.
For confirm `Okay, I have you record a claim in the category {receiptType} for {merchantType} for {amountCurrency} {amountType} on {receiptdateType}. Should I store the the claim?`
For Cancel (if the user says "no") `Okay. I will forget your claim.`

##### 5E. Fulfillment for intent `GetExpenseReport`
Click the radio button to `Return parameters to client`.

##### 5F. Response for intent `GetExpenseReport`
Add the following responses to the intent:
* Thanks. The claim is stored.
* Done.
