import Papa from 'papaparse';

export function parseCSVData(csvText) {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  return result.data.map(row => ({
    orderId: row['Order id'] || '',
    orderStatus: row['Order Status'] || '',
    orderTime: row['Order Time'] || '',
    completeTime: row['Complete Time'] || '',
    clickTime: row['Click Time'] || '',
    shopName: row['Shop Name'] || '',
    itemName: row['Item Name'] || '',
    price: parseFloat(row['Price(Rp)']) || 0,
    qty: parseInt(row['Qty']) || 0,
    purchaseValue: parseFloat(row['Purchase Value(Rp)']) || 0,
    itemShopeeCommRate: row['Item Shopee Commission Rate'] || '0%',
    itemShopeeComm: parseFloat(row['Item Shopee Commission(Rp)']) || 0,
    itemSellerCommRate: row['Item Seller Commission Rate'] || '0%',
    itemSellerComm: parseFloat(row['Item Seller Commission(Rp)']) || 0,
    itemTotalComm: parseFloat(row['Item Total Commission(Rp)']) || 0,
    orderShopeeComm: parseFloat(row['Order Shopee Commission(Rp)']) || 0,
    orderSellerComm: parseFloat(row['Order Seller Commission(Rp)']) || 0,
    totalOrderComm: parseFloat(row['Total Order Commission(Rp)']) || 0,
    affiliateNetComm: parseFloat(row['Affiliate Net Commission(Rp)']) || 0,
    affiliateStatus: row['Affiliate Item Status'] || '',
    attributionType: row['Attribution Type'] || '',
    buyerStatus: row['Buyer Status'] || '',
    tagLink1: row['Tag_link1'] || '',
    tagLink2: row['Tag_link2'] || '',
    tagLink3: row['Tag_link3'] || '',
    channel: row['Channel'] || '',
    category: row['L1 Global Category'] || '',
    subCategory: row['L2 Global Category'] || '',
    shopType: row['Shop Type'] || '',
  }));
}

export function parseClickData(csvText) {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  return result.data.map(row => {
    let rawTag = row['Tag_link'] || '';
    let cleanTag = rawTag.replace(/[-_]+$/, ''); // clean trailing dashes
    if (!cleanTag) cleanTag = 'Unknown';

    return {
      clickId: row['Click id'] || '',
      clickTime: row['Click Time'] || '',
      region: row['Click Region'] || '',
      tagLink: cleanTag,
      referrer: row['Referrer'] || '',
    };
  });
}

export function aggregateClicksByTagLink(clickData) {
  const map = {};
  if (!clickData) return map;
  clickData.forEach(row => {
    const tag = row.tagLink;
    if (!map[tag]) map[tag] = 0;
    map[tag] += 1;
  });
  return map;
}



export function formatRupiah(num) {
  if (num == null || isNaN(num)) return 'Rp 0';
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

export function formatNumber(num) {
  if (num == null || isNaN(num)) return '0';
  return Math.round(num).toLocaleString('id-ID');
}

export function getTimeDiffHours(clickTime, orderTime) {
  if (!clickTime || !orderTime) return null;
  const click = new Date(clickTime);
  const order = new Date(orderTime);
  const diffMs = order - click;
  return Math.round(diffMs / (1000 * 60 * 60) * 10) / 10;
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getDayName(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', { weekday: 'long' });
}

export function aggregateByTagLink(data, clickData = null) {
  const clickMap = clickData ? aggregateClicksByTagLink(clickData) : {};
  const map = {};
  
  data.forEach(row => {
    const tag = row.tagLink1 || 'Unknown';
    if (!map[tag]) {
      map[tag] = {
        name: tag,
        totalOrders: new Set(),
        totalItems: 0,
        totalPurchaseValue: 0,
        totalCommission: 0,
        totalAffiliateComm: 0,
        clicks: clickMap[tag] || 0,
        totalClickToOrderHours: 0,
        validClickToOrderCount: 0,
        channels: {},
        categories: {},
        dates: {},
      };
    }
    const entry = map[tag];
    entry.totalOrders.add(row.orderId);
    entry.totalItems += 1;
    entry.totalPurchaseValue += row.purchaseValue;
    entry.totalCommission += row.totalOrderComm;
    entry.totalAffiliateComm += row.affiliateNetComm;

    if (row.clickTime && row.orderTime) {
      const diffHours = getTimeDiffHours(row.clickTime, row.orderTime);
      if (diffHours !== null && diffHours >= 0 && diffHours < 10000) {
        entry.totalClickToOrderHours += diffHours;
        entry.validClickToOrderCount += 1;
      }
    }

    const ch = row.channel || 'Unknown';
    entry.channels[ch] = (entry.channels[ch] || 0) + 1;

    const cat = row.category || 'Lainnya';
    entry.categories[cat] = (entry.categories[cat] || 0) + 1;

    if (row.orderTime) {
      const date = row.orderTime.split(' ')[0];
      if (date) {
        if (!entry.dates[date]) entry.dates[date] = { orders: new Set(), items: 0, commission: 0, purchaseValue: 0 };
        entry.dates[date].orders.add(row.orderId);
        entry.dates[date].items += 1;
        entry.dates[date].commission += row.totalOrderComm;
        entry.dates[date].purchaseValue += row.purchaseValue;
      }
    }
  });

  Object.keys(clickMap).forEach(tag => {
    if (!map[tag]) {
      map[tag] = {
        name: tag,
        totalOrders: new Set(),
        totalItems: 0,
        totalPurchaseValue: 0,
        totalCommission: 0,
        totalAffiliateComm: 0,
        clicks: clickMap[tag],
        totalClickToOrderHours: 0,
        validClickToOrderCount: 0,
        channels: {},
        categories: {},
        dates: {},
      };
    }
  });

  return Object.values(map).map(entry => {
    const avgClickToOrderHours = entry.validClickToOrderCount > 0
      ? entry.totalClickToOrderHours / entry.validClickToOrderCount
      : null;

    return {
      ...entry,
      totalOrders: entry.totalOrders.size,
      avgClickToOrderHours,
      dates: Object.entries(entry.dates).map(([date, d]) => ({
        date,
        orders: d.orders.size,
        items: d.items,
        commission: d.commission,
        purchaseValue: d.purchaseValue,
      })).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }).sort((a, b) => b.totalCommission - a.totalCommission);
}

export function aggregateByDate(data) {
  const map = {};
  data.forEach(row => {
    if (!row.orderTime) return;
    const date = row.orderTime.split(' ')[0];
    if (!date) return;
    if (!map[date]) {
      map[date] = {
        date,
        orders: new Set(),
        items: 0,
        totalPurchaseValue: 0,
        totalCommission: 0,
        tagLinks: {},
        channels: {},
      };
    }
    const entry = map[date];
    entry.orders.add(row.orderId);
    entry.items += 1;
    entry.totalPurchaseValue += row.purchaseValue;
    entry.totalCommission += row.totalOrderComm;

    const tag = row.tagLink1 || 'Unknown';
    if (!entry.tagLinks[tag]) entry.tagLinks[tag] = { orders: new Set(), items: 0, commission: 0, purchaseValue: 0 };
    entry.tagLinks[tag].orders.add(row.orderId);
    entry.tagLinks[tag].items += 1;
    entry.tagLinks[tag].commission += row.totalOrderComm;
    entry.tagLinks[tag].purchaseValue += row.purchaseValue;

    const ch = row.channel || 'Unknown';
    entry.channels[ch] = (entry.channels[ch] || 0) + 1;
  });

  return Object.values(map).map(entry => ({
    ...entry,
    orders: entry.orders.size,
    tagLinks: Object.entries(entry.tagLinks).map(([name, d]) => ({
      name,
      orders: d.orders.size,
      items: d.items,
      commission: d.commission,
      purchaseValue: d.purchaseValue,
    })).sort((a, b) => b.commission - a.commission),
  })).sort((a, b) => a.date.localeCompare(b.date));
}

export function aggregateByChannel(data) {
  const map = {};
  data.forEach(row => {
    const ch = row.channel || 'Unknown';
    if (!map[ch]) {
      map[ch] = { name: ch, orders: new Set(), items: 0, totalCommission: 0, totalPurchaseValue: 0 };
    }
    map[ch].orders.add(row.orderId);
    map[ch].items += 1;
    map[ch].totalCommission += row.totalOrderComm;
    map[ch].totalPurchaseValue += row.purchaseValue;
  });
  return Object.values(map).map(e => ({ ...e, orders: e.orders.size })).sort((a, b) => b.totalCommission - a.totalCommission);
}

// ===== META ADS PARSING & ANALYSIS =====

export function parseMetaAdsData(csvText, ppnRate = 0) {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  const multiplier = 1 + (ppnRate / 100);

  const rawData = result.data
    .filter(row => row['Campaign name'] && row['Campaign name'].trim() !== '')
    .map(row => ({
      reportStart: row['Reporting starts'] || '',
      reportEnd: row['Reporting ends'] || '',
      campaignName: (row['Campaign name'] || '').trim(),
      platform: (row['Platform'] || '').trim(),
      placement: (row['Placement'] || '').trim(),
      devicePlatform: (row['Device platform'] || '').trim(),
      campaignDelivery: (row['Campaign delivery'] || '').trim(),
      results: parseFloat(row['Results']) || 0,
      resultIndicator: row['Result indicator'] || '',
      costPerResult: parseFloat(row['Cost per results']) || 0,
      adSetBudget: parseFloat(row['Ad set budget']) || 0,
      adSetBudgetType: row['Ad set budget type'] || '',
      amountSpent: (parseFloat(row['Amount spent (IDR)']) || 0) * multiplier,
      impressions: parseFloat(row['Impressions']) || 0,
      reach: parseFloat(row['Reach']) || 0,
      attributionSetting: row['Attribution setting'] || '',
      ctr: parseFloat(row['CTR (link click-through rate)']) || 0,
    }));

  const expandedData = [];
  rawData.forEach(row => {
    if (!row.reportStart) {
      expandedData.push(row);
      return;
    }
    
    const start = new Date(row.reportStart);
    const end = row.reportEnd ? new Date(row.reportEnd) : start;
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      expandedData.push(row);
      return;
    }

    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive

    if (diffDays <= 1) {
      expandedData.push(row);
    } else {
      const dailySpend = row.amountSpent / diffDays;
      const dailyImpressions = row.impressions / diffDays;
      const dailyReach = row.reach / diffDays;
      const dailyResults = row.results / diffDays;

      for (let i = 0; i < diffDays; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        expandedData.push({
          ...row,
          reportStart: dateStr,
          reportEnd: dateStr,
          amountSpent: dailySpend,
          impressions: dailyImpressions,
          reach: dailyReach,
          results: dailyResults
        });
      }
    }
  });

  return expandedData;
}

export function aggregateMetaAdsByCampaign(metaData) {
  const map = {};
  metaData.forEach(row => {
    const name = row.campaignName;
    if (!map[name]) {
      map[name] = {
        campaignName: name,
        totalSpend: 0,
        totalImpressions: 0,
        totalReach: 0,
        totalClicks: 0,
        budget: row.adSetBudget,
        budgetType: row.adSetBudgetType,
        delivery: row.campaignDelivery,
        reportDate: row.reportStart,
        placements: {},
        platforms: {},
      };
    }
    const entry = map[name];
    entry.totalSpend += row.amountSpent;
    entry.totalImpressions += row.impressions;
    entry.totalReach += row.reach;
    entry.totalClicks += row.results;

    // Per placement
    if (row.placement) {
      const plKey = `${row.platform} — ${row.placement}`;
      if (!entry.placements[plKey]) {
        entry.placements[plKey] = { platform: row.platform, placement: row.placement, spend: 0, impressions: 0, reach: 0, clicks: 0 };
      }
      entry.placements[plKey].spend += row.amountSpent;
      entry.placements[plKey].impressions += row.impressions;
      entry.placements[plKey].reach += row.reach;
      entry.placements[plKey].clicks += row.results;
    }

    // Per platform
    if (row.platform) {
      if (!entry.platforms[row.platform]) {
        entry.platforms[row.platform] = { spend: 0, impressions: 0, clicks: 0 };
      }
      entry.platforms[row.platform].spend += row.amountSpent;
      entry.platforms[row.platform].impressions += row.impressions;
      entry.platforms[row.platform].clicks += row.results;
    }
  });

  return Object.values(map).map(entry => {
    const cpc = entry.totalClicks > 0 ? entry.totalSpend / entry.totalClicks : 0;
    const ctr = entry.totalImpressions > 0 ? (entry.totalClicks / entry.totalImpressions) * 100 : 0;
    const cpm = entry.totalImpressions > 0 ? (entry.totalSpend / entry.totalImpressions) * 1000 : 0;

    return {
      ...entry,
      cpc,
      ctr,
      cpm,
      placements: Object.values(entry.placements)
        .map(p => ({
          ...p,
          cpc: p.clicks > 0 ? p.spend / p.clicks : 0,
          ctr: p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0,
        }))
        .sort((a, b) => b.spend - a.spend),
    };
  }).sort((a, b) => b.totalSpend - a.totalSpend);
}

export function aggregateMetaAdsByPlacement(metaData) {
  const map = {};
  metaData.forEach(row => {
    if (!row.placement) return;
    const key = `${row.platform} — ${row.placement}`;
    if (!map[key]) {
      map[key] = { platform: row.platform, placement: row.placement, fullName: key, spend: 0, impressions: 0, reach: 0, clicks: 0 };
    }
    map[key].spend += row.amountSpent;
    map[key].impressions += row.impressions;
    map[key].reach += row.reach;
    map[key].clicks += row.results;
  });

  return Object.values(map).map(p => ({
    ...p,
    cpc: p.clicks > 0 ? p.spend / p.clicks : 0,
    ctr: p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0,
    cpm: p.impressions > 0 ? (p.spend / p.impressions) * 1000 : 0,
  })).sort((a, b) => b.spend - a.spend);
}

export function aggregateMetaAdsByPlatform(metaData) {
  const map = {};
  metaData.forEach(row => {
    if (!row.platform) return;
    if (!map[row.platform]) {
      map[row.platform] = { platform: row.platform, spend: 0, impressions: 0, reach: 0, clicks: 0 };
    }
    map[row.platform].spend += row.amountSpent;
    map[row.platform].impressions += row.impressions;
    map[row.platform].reach += row.reach;
    map[row.platform].clicks += row.results;
  });

  return Object.values(map).map(p => ({
    ...p,
    cpc: p.clicks > 0 ? p.spend / p.clicks : 0,
    ctr: p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0,
  })).sort((a, b) => b.spend - a.spend);
}

// Campaign name → TagLink matching
const CAMPAIGN_TAGLINK_MAP = {
  'plastik sepatu': 'PlastikSepatu',
  'kail pancing': 'KailPancing',
  'sepatu karet': 'SepatuKaret',
  'ketapel': 'Ketapel',
  'kunci decoder lama': 'AlatPembukaKunciDecoder',
  'kunci decoder baru': 'KunciDecoderBaru',
  'cover start engine': 'CoverStartEngine',
  'disel': 'Disel',
  'baju argentina': 'BajuArgentina',
  'cas': 'Cas',
  'dji': 'DroneDJI',
  'rolex': 'Rolex',
  'lampu tidur jorok': 'LampuTidurJorok',
  'jetky': 'Jetsky',
  'topeng 3d': 'Topeng3D',
  'insta 360': 'Insta360',
  'asbak putar': 'AsbakPutar',
};

export function matchCampaignToTagLink(campaignName) {
  const lower = campaignName.toLowerCase().replace(/\s*setingan\s*new\s*/gi, '').replace(/\s*new\s*/gi, '').trim();
  
  // Direct map lookup
  for (const [key, tagLink] of Object.entries(CAMPAIGN_TAGLINK_MAP)) {
    if (lower.includes(key)) return tagLink;
  }

  // Fallback: try to create a tag from campaign name
  const cleaned = lower.replace(/[^a-z0-9\s]/gi, '').trim();
  if (cleaned) {
    return cleaned.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  }
  return null;
}

export function crossReferenceAdsWithCommission(metaCampaigns, tagLinkData, customMapping = {}) {
  return metaCampaigns.map(campaign => {
    // Try custom mapping first, then auto-match
    let matchedTagLink = customMapping[campaign.campaignName] || matchCampaignToTagLink(campaign.campaignName);
    
    // Find matching taglink data
    let tagData = null;
    if (matchedTagLink) {
      tagData = tagLinkData.find(t => 
        t.name.toLowerCase() === matchedTagLink.toLowerCase() ||
        t.name.toLowerCase().includes(matchedTagLink.toLowerCase()) ||
        matchedTagLink.toLowerCase().includes(t.name.toLowerCase())
      );
    }

    const revenue = tagData ? tagData.totalCommission : 0;
    const purchaseValue = tagData ? tagData.totalPurchaseValue : 0;
    const orders = tagData ? tagData.totalOrders : 0;
    const clicks = tagData ? (tagData.clicks || 0) : 0;
    const roas = campaign.totalSpend > 0 ? revenue / campaign.totalSpend : 0;
    const roi = campaign.totalSpend > 0 ? ((revenue - campaign.totalSpend) / campaign.totalSpend) * 100 : 0;
    const profitLoss = revenue - campaign.totalSpend;
    
    let status = 'bep';
    if (profitLoss > 1000) status = 'cuan';
    else if (profitLoss < -1000) status = 'boncos';

    return {
      ...campaign,
      matchedTagLink: tagData ? tagData.name : matchedTagLink,
      isMatched: !!tagData,
      revenue,
      purchaseValue,
      orders,
      shopeeClicks: clicks,
      roas,
      roi,
      profitLoss,
      status,
    };
  }).sort((a, b) => b.totalSpend - a.totalSpend);
}

// Aggregate meta ads data by date for daily breakdown
export function aggregateMetaAdsByDate(metaData) {
  const map = {};
  metaData.forEach(row => {
    const date = row.reportStart;
    if (!date) return;
    if (!map[date]) {
      map[date] = { date, spend: 0, impressions: 0, reach: 0, clicks: 0, campaigns: new Set() };
    }
    map[date].spend += row.amountSpent;
    map[date].impressions += row.impressions;
    map[date].reach += row.reach;
    map[date].clicks += row.results;
    if (row.campaignName) map[date].campaigns.add(row.campaignName);
  });
  return Object.values(map).map(d => ({
    ...d,
    campaigns: d.campaigns.size,
    cpc: d.clicks > 0 ? d.spend / d.clicks : 0,
    ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
  })).sort((a, b) => a.date.localeCompare(b.date));
}

// Cross-reference daily: for each date, combine ad spend + commission data
export function crossReferenceDaily(metaAdsData, commissionData) {
  const adsByDate = {};
  metaAdsData.forEach(row => {
    const date = row.reportStart;
    if (!date) return;
    if (!adsByDate[date]) adsByDate[date] = { spend: 0, impressions: 0, clicks: 0, campaigns: new Set() };
    adsByDate[date].spend += row.amountSpent;
    adsByDate[date].impressions += row.impressions;
    adsByDate[date].clicks += row.results;
    if (row.campaignName) adsByDate[date].campaigns.add(row.campaignName);
  });

  const commByDate = {};
  commissionData.forEach(row => {
    if (!row.orderTime) return;
    const date = row.orderTime.split(' ')[0];
    if (!date) return;
    if (!commByDate[date]) commByDate[date] = { orders: new Set(), commission: 0, purchaseValue: 0, items: 0 };
    commByDate[date].orders.add(row.orderId);
    commByDate[date].commission += row.totalOrderComm;
    commByDate[date].purchaseValue += row.purchaseValue;
    commByDate[date].items += 1;
  });

  // Merge all dates
  const allDates = new Set([...Object.keys(adsByDate), ...Object.keys(commByDate)]);
  
  return [...allDates].sort().map(date => {
    const ads = adsByDate[date] || { spend: 0, impressions: 0, clicks: 0, campaigns: new Set() };
    const comm = commByDate[date] || { orders: new Set(), commission: 0, purchaseValue: 0, items: 0 };
    const spend = ads.spend;
    const revenue = comm.commission;
    const profitLoss = revenue - spend;
    const roas = spend > 0 ? revenue / spend : (revenue > 0 ? Infinity : 0);
    const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;
    
    let status = 'bep';
    if (profitLoss > 1000) status = 'cuan';
    else if (profitLoss < -1000) status = 'boncos';

    return {
      date,
      spend,
      impressions: ads.impressions,
      adClicks: ads.clicks,
      campaigns: ads.campaigns.size || 0,
      orders: comm.orders.size || 0,
      commission: revenue,
      purchaseValue: comm.purchaseValue,
      items: comm.items,
      profitLoss,
      roas,
      roi,
      status,
      hasAds: spend > 0,
      hasCommission: revenue > 0,
    };
  });
}

// Cross-reference daily for a specific campaign
export function crossReferenceCampaignDaily(campaignName, metaAdsData, commissionData, customMapping = {}) {
  // Filter meta ads for this campaign
  const campaignAds = metaAdsData.filter(row => row.campaignName === campaignName);
  
  // Find matching taglink name
  const matchedTagLink = customMapping[campaignName] || matchCampaignToTagLink(campaignName);
  
  // Filter commission for this taglink
  let campaignComm = [];
  if (matchedTagLink) {
    campaignComm = commissionData.filter(row => {
      const t1 = row.tagLink1 || '';
      return t1.toLowerCase() === matchedTagLink.toLowerCase() ||
             t1.toLowerCase().includes(matchedTagLink.toLowerCase()) ||
             matchedTagLink.toLowerCase().includes(t1.toLowerCase());
    });
  }

  // Use the existing crossReferenceDaily on the filtered data
  return crossReferenceDaily(campaignAds, campaignComm);
}

export function formatPercent(num, decimals = 1) {
  if (num == null || isNaN(num)) return '0%';
  return num.toFixed(decimals) + '%';
}

// ===== DATA MERGE FUNCTIONS =====

/**
 * Merge Meta Ads data: combine existing + new, deduplicate by unique key.
 * New data wins on conflict.
 */
export function mergeMetaAdsData(existingData, newData) {
  const makeKey = (row) =>
    `${row.reportStart}|${row.campaignName}|${row.platform}|${row.placement}|${row.devicePlatform}`;

  const map = new Map();
  // Add existing data first
  existingData.forEach(row => {
    map.set(makeKey(row), row);
  });
  // New data overwrites existing on conflict
  newData.forEach(row => {
    map.set(makeKey(row), row);
  });
  return [...map.values()];
}

/**
 * Merge Commission data: combine existing + new, deduplicate by unique key.
 * New data wins on conflict.
 */
export function mergeCommissionData(existingData, newData) {
  const makeKey = (row) =>
    `${row.orderId}|${row.itemName}|${row.tagLink1}|${row.price}|${row.qty}`;

  const map = new Map();
  // Add existing data first
  existingData.forEach(row => {
    map.set(makeKey(row), row);
  });
  // New data overwrites existing on conflict
  newData.forEach(row => {
    map.set(makeKey(row), row);
  });
  return [...map.values()];
}

