"""Seed seller counterparties into the database."""
import os
from datetime import datetime
from pymongo import MongoClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "pir_grain_pulses")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]
partners_col = db["partners"]

SELLERS = [
    {"companyName": "Abbey Global L.P.", "companyCode": "Abbey Global", "origins": ["Ukraine"], "address": "5 South Charlotte Street Edinburg EH2 4AN", "city": "Edinburg", "country": "Scotland"},
    {"companyName": "Adelon AG", "companyCode": "Adelon AG", "origins": ["Ukraine"], "address": "Zugerstrasse 32, 6340 Baar", "city": "Zug", "country": "Switzerland"},
    {"companyName": "Agrain Tarım Gıda San. ve Tic. A.Ş.", "companyCode": "Agrain Tarım", "origins": ["Russia"], "address": "Maslak Meydan Sokak Veko Giz Plaza No:3 Sarıyer, İç Kapı No:79", "city": "İstanbul", "country": "Türkiye"},
    {"companyName": "Agraro Buğday Tarım Tic. A.Ş.", "companyCode": "Agraro Buğday", "origins": ["Russia"], "address": "Esentepe Mah. Büyükdere Cad. Büyükdere Plaza No:195 İç Kapı No:5 Şişli", "city": "İstanbul", "country": "Türkiye"},
    {"companyName": "Agris Commodities FZCO", "companyCode": "Agris Comm.", "origins": ["Russia"], "address": "Unit 102, A2 Building DDP, Dubai Silicon Oasis", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Agriwave Trading DMCC", "companyCode": "Agriwave", "origins": ["Russia"], "address": "Unit No:30-01-5506 DMCC Business Centre Level No 1 Jewellery & Gemplex 3", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Agro Club DMCC", "companyCode": "Agro Club", "origins": ["Russia"], "address": "Unit No:607-A28, Platinum Tower, Plot No:JLT-PH1-I2, Jumeirah Lakes Towers", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Agro Fond LLC", "companyCode": "Agro Fond", "origins": ["Ukraine"], "address": "Volyn Ragion, Lutsk district, village Zvinyache, street Privokzalna 17", "city": "Lviv", "country": "Ukraine"},
    {"companyName": "Agro Total Trading LLC", "companyCode": "Agro Total", "origins": ["Russia"], "address": "Falcon House, Dubai Investment Park, Unit No:58", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Agro Trading LLC-FZ", "companyCode": "Agro Trading", "origins": ["Ukraine"], "address": "The Meydan Hotel, Grandstand, 6th Floor, Meydan Road, Nad Al Sheba", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Agroklub LLC", "companyCode": "Agroklub LLC", "origins": ["Russia"], "address": "Office:8, 9A Revolutsii Avenue, 394036", "city": "Voronezh", "country": "Russia"},
    {"companyName": "Almatrade FZCO", "companyCode": "Almatrade FZCO", "origins": ["Russia"], "address": "IFZA Business Park, DDP, PO Box 342001", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Alsaa Petroleum & Shipping FZC", "companyCode": "Alsaa Petroleum", "origins": ["Ukraine"], "address": "RAK Free Trade Zone, P.O. Box: 10335", "city": "Ras Al-Khaimah", "country": "United Arab Emirates"},
    {"companyName": "Amber SRL", "companyCode": "Amber SRL", "origins": ["Italy"], "address": "Via Filangiari 36, 80121", "city": "Naples", "country": "Italy"},
    {"companyName": "Aston Agro Industrial SA", "companyCode": "Aston Agro", "origins": ["Russia"], "address": "Avenue de la Gare 33, 1003", "city": "Lausanne", "country": "Switzerland"},
    {"companyName": "AV Trading Group Inc.", "companyCode": "AV Trading", "origins": ["Ukraine"], "address": "15 North Main Street, 100 West Hartford, CT, 06107", "city": "Connecticut", "country": "United States"},
    {"companyName": "Axden International FZCO", "companyCode": "Axden Int.", "origins": ["Russia"], "address": "Unit:2602 Swiss Tower, Jumeirah Lake Towers", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "BKV Invest UAB", "companyCode": "BKV Invest", "origins": ["Ukraine"], "address": "Sedos Street 34A, LT-87101", "city": "Telsiai", "country": "Lithuania"},
    {"companyName": "Black Soil Trading LLC", "companyCode": "Black Soil", "origins": ["Russia"], "address": "The Onyx Tower 1, Office:809", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Bulkexim Agro Trading FZCO", "companyCode": "Bulkexim Agro", "origins": ["Ukraine"], "address": "Dubai Digital Park Area Name: Dubai Silicon Oasis Registered No: DSO-EZCO-15674", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Centeragroexport PE", "companyCode": "Centeragroexport", "origins": ["Ukraine"], "address": "18021, Cherkasy Street Heroiv Dnipra, 69, Apt:365", "city": "Cherkasy", "country": "Ukraine"},
    {"companyName": "Concern Bread Industries LTD", "companyCode": "Concern Bread", "origins": ["Ukraine"], "address": "Agias Fylaxeos Street, 118, 3087", "city": "Limassol", "country": "Cyprus"},
    {"companyName": "Çetin Yüce İnş. Taah. İç ve Dış Tic. Ltd. Şti.", "companyCode": "Çetin Yüce", "origins": ["Ukraine"], "address": "17 Eylül Mah. Hacı Keşfettin Cad., No:6 Bandırma", "city": "Balıkesir", "country": "Türkiye"},
    {"companyName": "Delway DMCC", "companyCode": "Delway DMCC", "origins": ["Russia"], "address": "Mazaya Business Avenue BB2 Plot No:JLTE-PH2-BBB2, Jumeirah Lakes Towers", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Dmwar Trading, Unipessoal LDA", "companyCode": "Dmwar Trading", "origins": ["Ukraine"], "address": "Rua da Alfândega, No:10, 4A 9000-059", "city": "Funchal", "country": "Portugal"},
    {"companyName": "Dylox Middle East FZE", "companyCode": "Dylox Middle", "origins": ["Russia"], "address": "T1-5F-1B, RAKEZ Amenity Center Al Hamra Industrial Zone FZ", "city": "Ras Al Khaimah", "country": "United Arab Emirates"},
    {"companyName": "Eastoria DMCC", "companyCode": "Eastoria", "origins": ["Ukraine"], "address": "Unit No:5467, Almas Tower, Plot No:JLT-PH1-AO, Jumeirah Lakes Towers", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Elevator LLC", "companyCode": "Elevator", "origins": ["Russia"], "address": "Zheleznodorozhnaya Street 1, Mayachny Village, 453316 Republic of Bashkortostan", "city": "Kumertau", "country": "Russia"},
    {"companyName": "Elot LTD", "companyCode": "Elot LTD", "origins": ["Russia"], "address": "Office:2, 78A Mira Street. Vil. Starominskaya Starominskiy", "city": "Krasnodar", "country": "Russia"},
    {"companyName": "Enaz Tarım San. ve Tic. Ltd. Şti.", "companyCode": "Enaz Tarım", "origins": ["Russia"], "address": "Maslak Mahallesi Taşyoncası Sokak Maslak Ağaoğlu 1453 Sitesi No:T4A Blok D:83, Sarıyer, 34398", "city": "İstanbul", "country": "Türkiye"},
    {"companyName": "EU-Nomia LTD", "companyCode": "EU-Nomia", "origins": ["Ukraine"], "address": "Office:121, 16th Vasyl Levski Street, 8000", "city": "Burgas", "country": "Bulgaria"},
    {"companyName": "FarmFusion Tradehouse OÜ", "companyCode": "FarmFusion", "origins": ["Ukraine"], "address": "Harju Maakond, Põhja-Tallinna Linnaosa, Kopli TN 72D, 10412", "city": "Tallinn", "country": "Estonia"},
    {"companyName": "Frontlinexp LLC", "companyCode": "Frontlinexp", "origins": ["Russia"], "address": "Meydan Grandstand, 6th Floor, Meydan Road, Nad Al Sheba", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Geograins Limited", "companyCode": "Geograins", "origins": ["Ukraine"], "address": "207 Sussex Gardens, Westminster, W2 2RJ", "city": "London", "country": "United Kingdom"},
    {"companyName": "GH Dış Ticaret Sanayi Ltd. Şti.", "companyCode": "GH Dış Tic.", "origins": ["Russia"], "address": "Yavruturna Mahallesi Maliye 1. Sokak Davutoğlu İş Merkezi No:1/35 Merkez", "city": "Çorum", "country": "Türkiye"},
    {"companyName": "Golden Horizon L.L.C-FZ", "companyCode": "Golden Horizon", "origins": ["Russia"], "address": "Business Center 1, M Floor, The Meydan Hotel, Nad Al Sheba", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Grain Field LLC", "companyCode": "Grain Field", "origins": ["Russia"], "address": "Sobino Street 5 - Office 2 V, 344001", "city": "Rostov-on-Don", "country": "Russia"},
    {"companyName": "Grain Wave LLC", "companyCode": "Grain Wave", "origins": ["Russia"], "address": "Starokubanskaya Street 36/1 Office No:206, 350011", "city": "Krasnodar", "country": "Russia"},
    {"companyName": "Grainehouse OÜ", "companyCode": "Grainhouse", "origins": ["Ukraine"], "address": "Harju maakond, Tallinn, Kesklinna linnaosa Narva mnt 7-636, 10117", "city": "Tallinn", "country": "Estonia"},
    {"companyName": "Grainstock AG", "companyCode": "Grainstock", "origins": ["Russia"], "address": "Schiesshüttenweg 6, CH-6460", "city": "Altdorf", "country": "Switzerland"},
    {"companyName": "Granetrade OÜ", "companyCode": "Granetrade", "origins": ["Ukraine"], "address": "Harju Maakond, Keskllnna Llnnaosa, Narva Mnt 7-636, 10117", "city": "Tallinn", "country": "Estonia"},
    {"companyName": "Granit LLC", "companyCode": "Granit LLC", "origins": ["Russia"], "address": "Office:29,35,36, Bld:61/30, 16 Line Str.,344019", "city": "Rostov-on-Don", "country": "Russia"},
    {"companyName": "Hakan Foods DMCC", "companyCode": "Hakan Foods", "origins": ["Russia"], "address": "Armada Tower 2 Office No:2201 P.O. Box No:125089 Jumeirah Lake Towers", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Hamalexpo LLC", "companyCode": "Hamalexpo", "origins": ["Russia"], "address": "Mirzo Ulugbek District, Muhammad Yusuf Street, Olmachi MSG, 45-House", "city": "Tashkent", "country": "Uzbekistan"},
    {"companyName": "IJ Commodities OU", "companyCode": "IJ Commodities", "origins": ["Russia"], "address": "Narva Mnt. 7-634, 10117", "city": "Tallinn", "country": "Estonia"},
    {"companyName": "Inerco Trade SA", "companyCode": "Inerco Trade", "origins": ["Ukraine"], "address": "9 Rue Jules-Gachet 1260", "city": "Nyon", "country": "Switzerland"},
    {"companyName": "IP Sugarenko N.S.", "companyCode": "IP Sugarenko", "origins": ["Russia"], "address": "Serafimovocha Str, House 41, Apt 17", "city": "Rostov-on-Don", "country": "Russia"},
    {"companyName": "IVA Commodities DMCC", "companyCode": "IVA Comm.", "origins": ["Ukraine"], "address": "Office:2708-11, 27th Floor, Mazaya Business Avenue-AA1, Jumeirah Lakes Tower", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Krasnodarzernoprodukt LLC", "companyCode": "Krasnodarzernoprodukt (KZP)", "origins": ["Russia"], "address": "66 Karasunskaya str., Krasnodar, 350000, Russian Federation", "city": "Krasnodar", "country": "Russia"},
    {"companyName": "Landion FZCO", "companyCode": "Landion", "origins": ["Russia"], "address": "Dubai Silicon Oasis DDP, Building A4, 301-F", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Lucky Tradex SRL", "companyCode": "Lucky Tradex", "origins": ["Ukraine"], "address": "Jud. Vaslui, Mun. Şos. Huşi-Stanileşti No:50 735100", "city": "Husi", "country": "Romania"},
    {"companyName": "Meadow Grain Traders DMCC", "companyCode": "Meadow Grain", "origins": ["Russia"], "address": "Unit No:BA2597 DMCC Business Centre Level No:1 Jewellery & Gemplex 3", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Meke Commodity Trade House DMCC", "companyCode": "Meke Commodity", "origins": ["Russia", "Ukraine"], "address": "Building Unit No:30-01-1795 DMCC Business Center Level No:1 Jewellery & Gemplex 3", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Millcorp Geneve SA", "companyCode": "Millcorp Geneve", "origins": ["Ukraine"], "address": "Rue du Rhône 118, 1204", "city": "Geneva", "country": "Switzerland"},
    {"companyName": "Olam Global Agri Pte. Ltd.", "companyCode": "Olam Global", "origins": ["Russia", "Ukraine"], "address": "7 Straits View, Marina One East Tower, #20-01, 018936", "city": "Singapore", "country": "Singapore"},
    {"companyName": "Omni Grain Corporation", "companyCode": "Omni Grain", "origins": ["Russia"], "address": "Trust Company Complex, Ajeltake Road, Ajeltake Island, MH96960", "city": "Majuro", "country": "Marshall Islands"},
    {"companyName": "Orom-Imexpo SRL", "companyCode": "Orom-Imexpo", "origins": ["Moldova"], "address": "Renasterii Nationale Street, 3, Apt 1", "city": "Orhei", "country": "Moldova"},
    {"companyName": "Prime Goods Trading DMCC", "companyCode": "Prime Goods", "origins": ["Russia"], "address": "Unit No:2501, JBC4 Plot No:JLT-PH1-N3A Jumeirah Lakes Towers", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Prime Trading SA", "companyCode": "Prime Trading", "origins": ["Russia"], "address": "Boulevard Georges-Favon 43, 1204", "city": "Geneva", "country": "Switzerland"},
    {"companyName": "Promolog SRL", "companyCode": "Promolog SRL", "origins": ["Italy"], "address": "Via Aldo Moro 6, 45100", "city": "Rovigo", "country": "Italy"},
    {"companyName": "Proteinexp Limited", "companyCode": "Proteinexp", "origins": ["Russia"], "address": "Office No:T1-8F-6C, RAKEZ Amenity Center, Al Hamra Industrial Zone-FZ, P.O. Box:85805", "city": "Ras Al Khaimah", "country": "United Arab Emirates"},
    {"companyName": "Region Grain Company AG", "companyCode": "Region Grain", "origins": ["Ukraine"], "address": "Alte Haslenstrasse 5, 9053 Teufen AR", "city": "Teufen", "country": "Switzerland"},
    {"companyName": "Resource Overseas General Trading LLC", "companyCode": "Resource Overseas", "origins": ["Russia"], "address": "Bayswater Tower #1505, Business Bay, PO Box:414283", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Richfields Commodities DMCC", "companyCode": "Richfields Comm.", "origins": ["Russia"], "address": "Unit:4176 DMCC Business Centre Level 1 Jewellery and Gemplex 3", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Rostov Grain Terminal LLC", "companyCode": "Rostov Grain", "origins": ["Russia"], "address": "1st Lugovaya st. 42, Rostov-on-Don, Russian Federation", "city": "Rostov-on-Don", "country": "Russia"},
    {"companyName": "Rusagro-Prim SRL", "companyCode": "Rusagro-Prim", "origins": ["Moldova"], "address": "Street Garii 3", "city": "Cupcini", "country": "Moldova"},
    {"companyName": "Rusich-Export LLC", "companyCode": "Rusich-Export", "origins": ["Russia"], "address": "Sokolova Ave., House 80/206, Off. 702 344010", "city": "Rostov-on-Don", "country": "Russia"},
    {"companyName": "SGI Trade SA", "companyCode": "SGI Trade", "origins": ["Ukraine"], "address": "Avenue Mon-Repos 24, 1005", "city": "Lausanne", "country": "Switzerland"},
    {"companyName": "Sunflower Group FZE", "companyCode": "Sunflower Group", "origins": ["Ukraine"], "address": "Business Centre 103-104, Al Shmookh Building, Umm Al Quwain Free Zone Authority, Umm Al Quwain", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Sungate Commodities DMCC", "companyCode": "Sungate Comm.", "origins": ["Russia"], "address": "1004-24, 10th Floor, Swiss, Tower, Plot Y3, Jumeirah Lakes Towers", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Top Grain LLC", "companyCode": "Top Grain", "origins": ["Russia"], "address": "Voroshilovskiy Ave. 26, 3rd Floor, Office 2", "city": "Rostov-on-Don", "country": "Russia"},
    {"companyName": "Uriel Agro LLC", "companyCode": "Uriel Agro", "origins": ["Russia"], "address": "Malinovsky Street, Building 3B, Office 8, 344091", "city": "Rostov-on-Don", "country": "Russia"},
    {"companyName": "Utara Trading LLC", "companyCode": "Utara Trading", "origins": ["Russia"], "address": "Office No:703, Prakash King, Kundas Punjabi Bur Dubai - Burj Khalifa, 124888", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Vertiga Trading LLC", "companyCode": "Vertiga Trading", "origins": ["Ukraine"], "address": "PR1005, Office 405-058, Port Saeed", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Via Agro LLC", "companyCode": "Via Agro", "origins": ["Russia"], "address": "Privokzalnaya Street No:90/1, Office No:1, Pokrocskoye Village", "city": "Rostov on Don", "country": "Russia"},
    {"companyName": "Virtum LLC", "companyCode": "Virtum LLC", "origins": ["Russia"], "address": "Nagatino-Sadovniki MD, Varshavskoe Hw 35, Bld 1117105, FICT", "city": "Moscow", "country": "Russia"},
    {"companyName": "Zaria Trade LTD", "companyCode": "Zaria Trade", "origins": [], "address": "", "city": "", "country": ""},
]

# Companies that already exist as buyers but also appear in seller list - update with origins
EXISTING_UPDATES = [
    {"companyName": "ADM Turkey Tarım Ticaret A.Ş.", "origins": []},
    {"companyName": "Agro Maps Dış Tic. Ltd. Şti.", "origins": ["Russia"]},
    {"companyName": "Agron Tarım Ürünleri Tic. A.Ş.", "origins": ["Russia", "Ukraine"]},
    {"companyName": "Arion Tarım Tic. Ltd. Şti.", "origins": ["Russia"]},
    {"companyName": "Armada Gıda Tic. San. A.Ş.", "origins": ["Russia", "Ukraine"]},
    {"companyName": "Baha Tarımsal Faaliyetler San. Tic. A.Ş.", "origins": ["Russia", "Ukraine"]},
    {"companyName": "Bek Tarım Ltd. Şti.", "origins": ["Russia", "Ukraine"]},
    {"companyName": "Blue Danube DMCC", "origins": ["Russia"]},
    {"companyName": "BT Agro San. ve Tic. A.Ş.", "origins": ["Russia"]},
    {"companyName": "Candarlar Tarım Ürün. Mad. Nak. İç ve Dış Tic. Ltd. Şti.", "origins": ["Russia", "Ukraine"]},
    {"companyName": "Casillo SPA Societa Benefit", "origins": ["Italy"]},
    {"companyName": "DMC Agro Hububat Bakliyat Ltd. Şti.", "origins": ["Russia", "Ukraine"]},
    {"companyName": "Hitit AG", "origins": ["Russia", "Ukraine"]},
    {"companyName": "Promaksgrain Endüstri Tarım Ürünleri ve Gıda San. Tic. A.Ş.", "origins": ["Russia", "Ukraine"]},
    {"companyName": "Quadra Commodities SA", "origins": []},
    {"companyName": "Samancı Gıda Tarım ve Hayvancılık Ürünleri San. ve Tic. Ltd. Şti.", "origins": []},
    {"companyName": "Sibirya Agro Trading LLC", "origins": ["Russia"]},
    {"companyName": "Soylu Yem Tarım San. Tic. A.Ş.", "origins": ["Ukraine"]},
    {"companyName": "Vamos Tarım San. ve Tic. A.Ş.", "origins": ["Russia"]},
]

def seed_sellers():
    inserted = 0
    skipped = 0
    for s in SELLERS:
        existing = partners_col.find_one({"companyName": s["companyName"]})
        if existing:
            skipped += 1
            continue
        doc = {
            "companyName": s["companyName"],
            "companyCode": s["companyCode"],
            "contactPerson": "",
            "address": s["address"],
            "city": s["city"],
            "country": s["country"],
            "email": "",
            "phone": "",
            "whatsapp": "",
            "type": "seller",
            "origins": s.get("origins", []),
            "tradeContacts": [],
            "executionContacts": [],
            "departments": [],
            "notes": "",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        }
        partners_col.insert_one(doc)
        inserted += 1
    print(f"New sellers inserted: {inserted}, skipped (already existed): {skipped}")

    # Update existing buyers with origins data
    updated = 0
    for u in EXISTING_UPDATES:
        result = partners_col.update_one(
            {"companyName": u["companyName"]},
            {"$set": {"origins": u["origins"], "updatedAt": datetime.utcnow()}}
        )
        if result.modified_count > 0:
            updated += 1
    print(f"Existing partners updated with origins: {updated}")

    from collections import Counter
    types = Counter(p["type"] for p in partners_col.find({}, {"type": 1}))
    print(f"Total partners: {sum(types.values())}")
    print(f"Type distribution: {dict(types)}")

if __name__ == "__main__":
    seed_sellers()
