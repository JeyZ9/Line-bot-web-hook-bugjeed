const ssId = "19yC5HxMJWR_Fo4T1GtTwQl5QPNasSCojY3EwS7aoLfQ"
const productSheetName = "products";
const orderSheetName = "orders";
const orderItemSheetName = "orderItem";
const userSheetName = "userInfo";

const ss = SpreadsheetApp.openById(ssId);
const productsSheet = ss.getSheetByName(productSheetName);
const ordersSheet = ss.getSheetByName(orderSheetName);
const orderItemSheet = ss.getSheetByName(orderItemSheetName);
const userSheet = ss.getSheetByName(userSheetName);
Logger = BetterLog.useSpreadsheet(ssId);

function doPost(e){
  const dialogFlowData = JSON.parse(e.postData.contents);
  const intent = dialogFlowData.queryResult.intent.displayName;
  const userMessage = dialogFlowData.queryResult.queryText;
  Logger.log(userMessage);
  const userId = getUserIdFromRequest(dialogFlowData) || "Unknown"

  if(intent == "Show Products"){
    return getProduct();
  }
  // if(intent == "Make an order"){
  //   return getOrder();
  // }
  if(intent == "Make an order - quantity - yes"){
    return makeOrder(dialogFlowData, userId);
  }
  if(intent == "View My Orders"){
    return viewOrder(userId);
  }
  if(intent == "Payment Confirm"){
    return endProcess(userId);
  }
  if(intent == "PromptPay"){
    return makePay(userId);
  }
  if(intent == "Promotion Now"){
    return promotion();
  }
  if(intent == "Make an address - yes"){
    // return MakeAddress();
    return makeAddress(dialogFlowData, userId)
  }
}

const getProduct = () => {
  const tableArray = productsSheet.getRange(2,1, productsSheet.getLastRow() - 1, productsSheet.getLastColumn()).getValues();

  let products = [];
  for(let i=0;i<tableArray.length;i++){
    let row = tableArray[i];
    let name = row[1];
    let description = row[3];
    let brand = row[4];
    let price = row[5];
    let publicImage = row[8];

    let bubble = {
                "type": "bubble",
                "hero": {
                  "type": "image",
                  "url": `${publicImage}`,
                  "size": "full",
                  "aspectRatio": "20:13",
                  "aspectMode": "cover"
                },
                "body": {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    {
                      "type": "text",
                      "text": `${name} - ${brand}`,
                      "weight": "bold",
                      "size": "xl"
                    },
                    {
                      "type": "text",
                      "text": `฿ ${price}.-`,
                      "size": "lg",
                      "color": "#FF0000"
                    },
                    {
                      "type": "text",
                      "text": `รายละเอียด ${description}`,
                      "wrap": true,
                      "margin": "md"
                    },
                    {
                      "type": "text",
                      "text": `ยี่ห้อ ${brand}`,
                      "wrap": true,
                      "margin": "md"
                    }
                  ]
                },
                "footer": {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    {
                      "type": "button",
                      "style": "primary",
                      "action": {
                        "type": "message",
                        "label": "สั่งซื้อ",
                        "text": `สั่งซื้อ ${name} ${price} ฿` 
                      }
                    }
                  ]
                }
    };
    products.push(bubble);
  }

  Logger.log("say hi!")
  const result = {
    "fulfillmentMessages":[{
      "platform":"line",
      "type":4,
      "payload":{
        "line": {
          "type": "flex",
          "altText": "Burger Menu",
          "contents":{
            "type": "carousel",
            "contents": products
          }
        }
      }
    }]
  };

  const replyJSON = ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  return replyJSON;
}

const makeOrder = (dialogFlowData, userId) => {
  const productItem = dialogFlowData.queryResult.parameters;
  const itemName = productItem.products;
  const itemQuantity = productItem.number;
  const itemUnitPrice = productItem.price;
  const total = itemQuantity * itemUnitPrice;
  const isPayment = false;

  const lastRow = orderItemSheet.getLastRow() + 1;
  
  let orderId = lastRow>=10? "OR0" + orderItemSheet.getLastRow() : "OR00" + orderItemSheet.getLastRow();
  Logger.log(orderId);
  orderItemSheet.getRange(lastRow,1).setValue(orderId);
  orderItemSheet.getRange(lastRow,2).setValue(new Date());
  orderItemSheet.getRange(lastRow,3).setValue(userId);
  orderItemSheet.getRange(lastRow,4).setValue(itemName);
  orderItemSheet.getRange(lastRow,5).setValue(itemQuantity);
  orderItemSheet.getRange(lastRow,6).setValue(itemUnitPrice);
  orderItemSheet.getRange(lastRow,7).setValue(total);
  orderItemSheet.getRange(lastRow,8).setValue(isPayment);
  // ordersSheet.getRange(lastRow,8).setValue(isPayment);

  const listJson = [ 
    {
      "type": "template",
      "altText": "More order",
      "template": {
        "type": "confirm",
        "actions": [
          {
            "type": "message",
            "label": "ต้องการสั่งเพิ่ม",
            "text": "ยังอยากซื้ออีกหน่อยค่ะ"
          },
          {
            "type": "message",
            "label": "ไม่ต้องการ",
            "text": "พร้อมจ่ายตังแล้วววว"
          }
        ],
        "text": "เพิ่มสินค้าเรียบร้อยแล้วต้องการสั่งเพิ่มมั้ยจ๊ะ?"
      }
    }
  ];

  const fulfillmentMessages = [];

  listJson.forEach(list => {
    const result = {
      "platform": "line",
      "type": 4,
      "payload": {
        "line": list
      }
    };
    fulfillmentMessages.push(result);
  });

  const replyJSON = ContentService.createTextOutput(
    JSON.stringify({ "fulfillmentMessages": fulfillmentMessages })
  ).setMimeType(ContentService.MimeType.JSON);

  return replyJSON;

}

const makePay = (userId) => {

  // const tableOrder = ordersSheet.getRange(2, 1, ordersSheet.getLastRow(), ordersSheet.getLastColumn()).getValue();
  // Logger.log(tableOrder[1][8])

  const tableArray = orderItemSheet.getRange(2, 1, orderItemSheet.getLastRow() - 1, orderItemSheet.getLastColumn()).getValues();
  const orderList = [];
  
  for (let i = 0; i < tableArray.length; i++) {
    let row = tableArray[i];
    if (userId == row[2] && row[7] == false) {
      let productName = row[3];
      let quantity = row[4];
      let unitPrice = row[5];

      let checkProduct = orderList.find(order => order.productName === productName);

      if (checkProduct) {
        checkProduct.quantity += quantity;
      } else {
        orderList.push({
          productName: productName,
          quantity: quantity,
          unitPrice: unitPrice,
        });
      }
      orderItemSheet.getRange(i + 2, 8).setValue(true);
    }
  }

  let orderCode = String(Utilities.getUuid());
  Logger.log("OrderCode: " + orderCode);

  orderList.forEach(order => {
    Logger.log(`${order.productName} ${order.quantity}`);
    const lastRow = ordersSheet.getLastRow() + 1;
    let total = order.quantity * order.unitPrice;
    const status = "Pending";
    ordersSheet.getRange(lastRow, 1).setValue(new Date());
    ordersSheet.getRange(lastRow, 2).setValue(userId);
    ordersSheet.getRange(lastRow, 3).setValue(order.productName);
    ordersSheet.getRange(lastRow, 4).setValue(order.quantity);
    ordersSheet.getRange(lastRow, 5).setValue(order.unitPrice);
    ordersSheet.getRange(lastRow, 6).setValue(total);
    ordersSheet.getRange(lastRow, 7).setValue(status);
    ordersSheet.getRange(lastRow, 8).setValue(orderCode);
    ordersSheet.getRange(lastRow, 9).setValue(false);
  });
}

const makeAddress = (dialogFlowData,userId) => {
  let orderCode = "";
  const tableArray = ordersSheet.getRange(2, 1, ordersSheet.getLastRow() - 1, ordersSheet.getLastColumn()).getValues();
  for(let i=0;i<tableArray.length;i++){
    let row = tableArray[i];
    if(userId == row[1]){
      orderCode = row[7];
    }
  }
  Logger.log(orderCode);

  const userInfo = dialogFlowData.queryResult.parameters;
  // variable for userInfo
  let username = userInfo.name;
  let phone = userInfo.phone;
  let address = userInfo.address;
  let city = userInfo.city;
  let zipCode = userInfo.zipCode;

  const lastRow = userSheet.getLastRow() + 1;


  if(userId != null){
    userSheet.getRange(lastRow,1).setValue(userId);
    userSheet.getRange(lastRow,2).setValue(username.name);
    userSheet.getRange(lastRow,3).setValue(phone);
    userSheet.getRange(lastRow,4).setValue(address);
    userSheet.getRange(lastRow,5).setValue(city);
    userSheet.getRange(lastRow,6).setValue(zipCode);
    userSheet.getRange(lastRow,7).setValue(new Date());
    userSheet.getRange(lastRow,8).setValue(orderCode);

    const result = {
      "fulfillmentMessages":[{
        "platform":"line",
        "type":4,
        "payload":{
          "line": {
            "type": "text",
            "text": "บันทึกสำเร็จ! \nอย่าลืมชำระเงินน้าาาาาา"
          }
        }
      }]
    }
    const replyJSON = ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);

    return replyJSON;
  }
}

function viewOrder(userId){
  const tableArray = ordersSheet.getRange(2,1, ordersSheet.getLastRow() - 1, ordersSheet.getLastColumn()).getValues();

  let orderList = [];
  let orderArr = [];
  let totalPrice = 0;
  let statusOrder = "";
  for(let i=0;i<tableArray.length;i++){
      
    let row = tableArray[i];

    if(userId === row[1]){
      let productName = row[2];
      let quantity = Number(row[3]);
      let unitPrice = Number(row[4]);
      let total = Number(row[5]);
      let status = row[6];
      totalPrice += total;
      statusOrder = status;

      let checkProduct = orderArr.find(order => order.productName === productName);
      if (checkProduct) {
        checkProduct.quantity += quantity;
      }else{
        orderArr.push({
          productName: productName,
          quantity: quantity,
          unitPrice: unitPrice
        })
      }
    }
  }
  let menu = [];
  orderArr.forEach(order => {
    menu = {
                "type": "box",
                "layout": "baseline",
                "contents": [
                  {
                    "type": "text",
                    "text": `${order.quantity}`,
                    "size": "sm",
                    "color": "#555555",
                    "align": "start"
                  },
                  {
                    "type": "text",
                    "text": `${order.productName}`,
                    "size": "sm",
                    "color": "#111111",
                    "align": "start",
                    "margin": "5px"
                  },
                  {
                    "type": "text",
                    "text": `${order.unitPrice} ฿`,
                    "margin": "none",
                    "align": "end"
                  }
                ]
    };
    orderList.push(menu)
  })
  Logger.log(...orderList);
    const result = {
      "fulfillmentMessages":[{
        "platform":"line",
        "type":4,
        "payload":{
          "line": {
            "type": "flex",
            "altText": "Order Summary",
            "contents": {
              "type": "bubble",
              "body": {
                "type": "box",
                "layout": "vertical",
                "contents":[
                  {
                    "type": "text",
                    "text": "Order Summary",
                    "weight": "bold",
                    "size": "xl",
                    "margin": "md"
                  },
                  {
                    "type": "separator",
                    "margin": "xxl"
                  },
                  {
                    "type": "box",
                    "layout": "vertical",
                    "margin": "xxl",
                    "spacing": "sm",
                    "contents": [
                      ...orderList,
                      {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                          {
                            "type": "text",
                            "text": "Total",
                            "size": "sm",
                            "color": "#555555",
                          },
                          {
                            "type": "text",
                            "text": `${totalPrice} ฿`,
                            "size": "sm",
                            "color": "#111111",
                            "align": "end"
                          }
                        ]
                      },
                      {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                          {
                            "type": "text",
                            "text": "Status",
                            "size": "sm",
                            "color": "#555555",
                          },
                          {
                            "type": "text",
                            "text": `${statusOrder}`,
                            "size": "sm",
                            "color": "#111111",
                            "align": "end"
                          }
                        ]
                      }
                    ]
                  }
                ] 
              }
            }
          }
        }
      }]
    };
  const replyJSON = ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  return replyJSON;
}

function endProcess(userId){
  const tableArray = ordersSheet.getRange(2,1, ordersSheet.getLastRow() - 1, ordersSheet.getLastColumn()).getValues();

  let orderList = [];
  let orderArr = [];
  let totalPrice = 0;
  let statusOrder = "";
  for(let i=0;i<tableArray.length;i++){
      
    let row = tableArray[i];

    if(userId === row[1]){
      let productName = row[2];
      let quantity = Number(row[3]);
      let unitPrice = Number(row[4]);
      let total = Number(row[5]);
      let status = row[6];
      totalPrice += total;
      statusOrder = status;

      let checkProduct = orderArr.find(order => order.productName === productName);
      if (checkProduct) {
        checkProduct.quantity += quantity;
      }else{
        orderArr.push({
          productName: productName,
          quantity: quantity,
          unitPrice: unitPrice
        })
      }
    }



    // const filterMenu = menuList.filter(item => item.contents.text);
    // Logger.log(filterMenu);

  }
  let menu = [];
  orderArr.forEach(order => {
    menu = {
                "type": "box",
                "layout": "baseline",
                "contents": [
                  {
                    "type": "text",
                    "text": `${order.quantity}`,
                    "size": "sm",
                    "color": "#555555",
                    "align": "start"
                  },
                  {
                    "type": "text",
                    "text": `${order.productName}`,
                    "size": "sm",
                    "color": "#111111",
                    "align": "start",
                    "margin": "5px"
                  },
                  {
                    "type": "text",
                    "text": `${order.unitPrice} ฿`,
                    "margin": "none",
                    "align": "end"
                  }
                ]
    };
    orderList.push(menu)
  })
  Logger.log(...orderList);
    const listJson = [ {
            "type": "flex",
            "altText": "Order Summary",
            "contents": {
              "type": "bubble",
              // "hero": {
              //   "type": "image",
              //   "url": `${createPromptPayQRCode("0656683656",totalPrice)}`,
              //   "size": "full",
              //   "aspectRatio": "20:13",
              //   "aspectMode": "fit"
              //   // "action": {
              //   //   "type": "uri",
              //   //   "uri": "https://line.me/"
              //   // }
              // },
              "body": {
                "type": "box",
                "layout": "vertical",
                "contents":[
                   {
                      "type": "text",
                      "text": "Order Summary",
                      "weight": "bold",
                      "size": "xl",
                      "margin": "md"
                    },
                    {
                      "type": "separator",
                      "margin": "xxl"
                    },
                    {
                      "type": "box",
                      "layout": "vertical",
                      "margin": "xxl",
                      "spacing": "sm",
                      "contents": [
                        ...orderList,
                        {
                          "type": "box",
                          "layout": "horizontal",
                          "contents": [
                            {
                              "type": "text",
                              "text": "Total",
                              "size": "sm",
                              "color": "#555555",
                            },
                            {
                              "type": "text",
                              "text": `${totalPrice} ฿`,
                              "size": "sm",
                              "color": "#111111",
                              "align": "end"
                            }
                          ]
                        },
                        {
                          "type": "box",
                          "layout": "horizontal",
                          "contents": [
                            {
                              "type": "text",
                              "text": "Status",
                              "size": "sm",
                              "color": "#555555",
                            },
                            {
                              "type": "text",
                              "text": `${statusOrder}`,
                              "size": "sm",
                              "color": "#111111",
                              "align": "end"
                            }
                          ]
                        },
                        {
                          "type": "image",
                          "url": `${createPromptPayQRCode("0656683656",totalPrice)}`
                        }
                      ]
                    }
                ] 
              }
            }
          },
          {
            "text": "อย่าลืมเพิ่มที่อยู่ด้วยนะ",
            "type": "text",
            "quickReply": {
              "items": [
                {
                  "action": {
                    "text": "เพิ่มที่อยู่",
                    "label": "เพิ่มเลย",
                    "type": "message"
                  }
                }
              ]
            }
          }
    ]


  const fulfillmentMessages = [];

  listJson.forEach(list => {
    const result = {
      "platform": "line",
      "type": 4,
      "payload": {
        "line": list
      }
    };
    fulfillmentMessages.push(result);
  });

  const replyJSON = ContentService.createTextOutput(
    JSON.stringify({ "fulfillmentMessages": fulfillmentMessages })
  ).setMimeType(ContentService.MimeType.JSON);

  return replyJSON;
}

// Create a PromptPay QR Code URL
function createPromptPayQRCode(phoneNumber, amount) {
    // Base URL สำหรับสร้าง PromptPay QR Code
    var baseURL = 'https://promptpay.io/';

    // แปลงเบอร์โทรศัพท์ให้อยู่ในรูปแบบที่ถูกต้อง
    var promptPayID = phoneNumber.replace(/-/g, ''); // ลบเครื่องหมายขีด

    // สร้าง URL สำหรับการสร้าง QR Code
    var qrCodeURL = baseURL + promptPayID + '/' + amount;

    return qrCodeURL;
}

const promotion = () => {
  const result = {
      "fulfillmentMessages":[{
        "platform":"line",
        "type":4,
        "payload":{
          "line": {
            "type": "image",
            "originalContentUrl": "https://lh3.googleusercontent.com/d/1yBuapguXGr4rnhjr_0xZpNzxhgxpgNqp",
            "previewImageUrl": "https://lh3.googleusercontent.com/d/1yBuapguXGr4rnhjr_0xZpNzxhgxpgNqp"
          }
        }
      }]
    };
  const replyJSON = ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  return replyJSON;
}

// get user id from order
function getUserIdFromRequest(request){ 
  const userId = request?.originalDetectIntentRequest?.payload?.data.source.userId || null;
  return userId;
}