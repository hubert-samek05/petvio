// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.3"),
        .package(name: "CapacitorCommunityBackgroundGeolocation", path: "../../../node_modules/.pnpm/@capacitor-community+background-geolocation@1.3.1_@capacitor+core@8.5.3/node_modules/@capacitor-community/background-geolocation"),
        .package(name: "CapacitorFirebaseAuthentication", path: "../../../node_modules/.pnpm/@capacitor-firebase+authentication@8.6.0_@capacitor+core@8.5.3/node_modules/@capacitor-firebase/authentication"),
        .package(name: "CapacitorFirebaseMessaging", path: "../../../node_modules/.pnpm/@capacitor-firebase+messaging@8.5.2_@capacitor+core@8.5.3/node_modules/@capacitor-firebase/messaging"),
        .package(name: "CapacitorBrowser", path: "../../../node_modules/.pnpm/@capacitor+browser@8.0.2_@capacitor+core@8.5.3/node_modules/@capacitor/browser"),
        .package(name: "CapacitorGeolocation", path: "../../../node_modules/.pnpm/@capacitor+geolocation@8.2.4_@capacitor+core@8.5.3/node_modules/@capacitor/geolocation"),
        .package(name: "CapacitorLocalNotifications", path: "../../../node_modules/.pnpm/@capacitor+local-notifications@8.3.1_@capacitor+core@8.5.3/node_modules/@capacitor/local-notifications"),
        .package(name: "RevenuecatPurchasesCapacitor", path: "../../../node_modules/.pnpm/@revenuecat+purchases-capacitor@14.1.0_@capacitor+core@8.5.3/node_modules/@revenuecat/purchases-capacitor")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorCommunityBackgroundGeolocation", package: "CapacitorCommunityBackgroundGeolocation"),
                .product(name: "CapacitorFirebaseAuthentication", package: "CapacitorFirebaseAuthentication"),
                .product(name: "CapacitorFirebaseMessaging", package: "CapacitorFirebaseMessaging"),
                .product(name: "CapacitorBrowser", package: "CapacitorBrowser"),
                .product(name: "CapacitorGeolocation", package: "CapacitorGeolocation"),
                .product(name: "CapacitorLocalNotifications", package: "CapacitorLocalNotifications"),
                .product(name: "RevenuecatPurchasesCapacitor", package: "RevenuecatPurchasesCapacitor")
            ]
        )
    ]
)
