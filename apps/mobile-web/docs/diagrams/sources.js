// Source mermaid for every screen-flow diagram embedded in the roadmap.
// Each entry produces a matching SVG + PNG in this folder when you run
//   node docs/build-diagrams.js
//
// Keep node labels short — Mermaid's auto-layout starts wrapping awkwardly
// past ~30 chars. Use <br/> for forced line breaks inside a node.

module.exports = [
  {
    name: '01-app-map',
    title: 'Top-level app map',
    code: `flowchart LR
  Splash([Splash]) --> OnboardCheck{First<br/>launch?}
  OnboardCheck -- yes --> Onboard[Onboarding<br/>3 slides]
  OnboardCheck -- no --> AuthCheck{Authenticated?}
  Onboard --> Login
  AuthCheck -- no --> Login[Login]
  AuthCheck -- yes --> Tabs

  Login --> Register[Register]
  Login --> Forgot[Forgot password]
  Forgot --> Reset[Reset password]
  Login --> Tabs

  Tabs[/Bottom tab bar/]
  Tabs --> Home
  Tabs --> Search
  Tabs --> Cart
  Tabs --> Wishlist
  Tabs --> Account

  classDef root fill:#11ab3a,color:#fff,stroke:#0c831f
  classDef tab fill:#ecfdf3,color:#0c831f,stroke:#11ab3a
  class Splash,Onboard root
  class Tabs tab`,
  },
  {
    name: '02-browse',
    title: 'Browse & discovery flow',
    code: `flowchart LR
  Home[Home] -- search bar --> Search
  Home -- category tile --> CategoryDetail[Category detail]
  Home -- product card --> PDP
  Home -- store --> Store[Store page]
  Home -- bell --> Notifications

  Search[Search] -- query --> Results[Search results]
  Results -- filter button --> FilterSheet[Filter sheet<br/>sort price rating brand]
  Results -- product --> PDP
  Search -- recent term --> Results

  Categories[Categories index] --> CategoryDetail
  CategoryDetail --> PDP

  PDP[Product detail<br/>gallery reviews share]
  PDP -- add to cart --> Cart
  PDP -- buy now --> Cart
  PDP -- store link --> Store
  PDP -- heart --> Wishlist
  PDP -- share --> ShareSheet([Share sheet])

  Store -- about products featured --> Store
  Store -- product --> PDP

  classDef screen fill:#ffffff,stroke:#11ab3a,stroke-width:1.5px
  classDef ext fill:#fffbeb,stroke:#b07a00
  class Home,Search,Results,PDP,Store,Categories,CategoryDetail,Notifications,Wishlist,Cart screen
  class FilterSheet,ShareSheet ext`,
  },
  {
    name: '03-checkout',
    title: 'Cart, checkout & orders',
    code: `flowchart LR
  Cart[Cart<br/>quantity savings ETA]
  Cart -- checkout --> CheckoutAddr[Step 1<br/>Select address]
  CheckoutAddr -- add new --> NewAddress[New address form<br/>+ pincode auto-fill]
  NewAddress --> CheckoutAddr
  CheckoutAddr -- continue --> CheckoutReview[Step 2<br/>Review coupon payment]
  CheckoutReview -- COD --> OrderSuccess
  CheckoutReview -- Razorpay --> RazorpayWV[(Razorpay<br/>WebView)]
  RazorpayWV -- success --> OrderSuccess[Order success]
  RazorpayWV -- failed --> CheckoutReview
  OrderSuccess -- view order --> OrderDetail

  OrdersList[Orders list] --> OrderDetail[Order detail<br/>timeline tracker price]
  OrderDetail -- cancel --> OrderDetail
  OrderDetail -- retry payment --> RazorpayWV
  OrderDetail -- invoice --> Invoice([PDF download])
  OrderDetail -- rate item --> Review[Write review]
  OrderDetail -- return / replace --> ReturnCreate[Create return<br/>reason photos refund]

  classDef screen fill:#ffffff,stroke:#11ab3a,stroke-width:1.5px
  classDef payment fill:#fef2f2,stroke:#dc2626
  classDef external fill:#fffbeb,stroke:#b07a00
  class Cart,CheckoutAddr,CheckoutReview,OrderSuccess,OrdersList,OrderDetail,NewAddress,Review,ReturnCreate screen
  class RazorpayWV payment
  class Invoice external`,
  },
  {
    name: '04-account',
    title: 'Account hub',
    code: `flowchart LR
  Account[Account home<br/>avatar loyalty pill]
  Account --> Activity[Activity]
  Account --> Rewards[Rewards]
  Account --> Prefs[Preferences]
  Account --> Help[Help]

  Activity --> Orders[My orders]
  Activity --> Wishlist
  Activity --> Returns[Returns list]
  Returns -- detail --> ReturnDetail[Return detail]

  Rewards --> Loyalty[Loyalty<br/>balance redeem ledger]
  Rewards --> Wallet[Wallet<br/>balance txns top-up]
  Loyalty -- redeem --> RedeemModal[Redeem modal]
  Loyalty -- share code --> ShareSheet([Share sheet])
  Wallet -- add money --> RazorpayWV[(Razorpay)]
  Wallet -- KYC required --> KYCNotice[KYC gate]

  Prefs --> Profile[Profile details]
  Prefs --> Addresses[Saved addresses]
  Prefs --> Notifications[Notifications inbox]
  Prefs --> Security[Account security<br/>change password]
  Addresses -- add/edit --> AddrForm[Address form<br/>+ pincode lookup]

  Help --> Support[Support hub]
  Help --> Settings[App settings]
  Help --> SignOut[(Sign out)]

  classDef screen fill:#ffffff,stroke:#11ab3a,stroke-width:1.5px
  classDef group fill:#ecfdf3,stroke:#0c831f
  classDef payment fill:#fef2f2,stroke:#dc2626
  class Account,Orders,Wishlist,Returns,ReturnDetail,Loyalty,Wallet,Profile,Addresses,Notifications,Security,Support,Settings,AddrForm,RedeemModal,KYCNotice screen
  class Activity,Rewards,Prefs,Help group
  class RazorpayWV payment`,
  },
  {
    name: '05-support',
    title: 'Support flow',
    code: `flowchart LR
  SupportHub[Support hub<br/>chat CTA + ticket list]
  SupportHub -- start chat --> Chat[Chatbot]
  SupportHub -- new ticket --> SupportNew[New ticket form]
  SupportHub -- ticket card --> TicketDetail

  Chat -- resolved --> Chat
  Chat -- escalation --> AutoTicket[(Auto-create<br/>ticket)]
  AutoTicket --> TicketDetail
  SupportNew --> TicketDetail

  TicketDetail[Ticket detail<br/>threaded messages]
  TicketDetail -- reply text --> TicketDetail
  TicketDetail -- attach photo --> ImagePicker([Image picker])
  ImagePicker --> Upload([Upload]) --> TicketDetail

  Notif[Notifications inbox] -- TICKET_REPLY tap --> TicketDetail

  classDef screen fill:#ffffff,stroke:#11ab3a,stroke-width:1.5px
  classDef bot fill:#f5f3ff,stroke:#a78bfa
  classDef ext fill:#fffbeb,stroke:#b07a00
  class SupportHub,SupportNew,TicketDetail,Notif screen
  class Chat,AutoTicket bot
  class ImagePicker,Upload ext`,
  },
  {
    name: '06-push',
    title: 'Push notification routing',
    code: `flowchart LR
  Push[(Push notification<br/>tap)]
  Push --> Router{type}
  Router -- ORDER_* --> OrderDetail[Order detail]
  Router -- RETURN_* --> Returns[Returns list]
  Router -- WALLET_* --> Wallet
  Router -- TICKET_REPLY --> TicketDetail
  Router -- PROMO/OFFER --> PDP[Product detail]
  Router -- unknown --> Home

  Inbox[Notifications inbox] --> Router

  classDef trigger fill:#eff6ff,stroke:#2563eb
  classDef screen fill:#ffffff,stroke:#11ab3a
  class Push,Inbox trigger
  class OrderDetail,Returns,Wallet,TicketDetail,PDP,Home screen`,
  },
];
