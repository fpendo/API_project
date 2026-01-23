"""
NAV Data Service - Fetches ETF NAV data from Yahoo Finance
For European UCITS ETFs (Irish-domiciled)
"""

import yfinance as yf
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json

class NAVDataService:
    def __init__(self):
        # ISIN to Yahoo Finance symbol mapping for Irish UCITS ETFs
        # Format: ISIN -> Yahoo Symbol
        # Common exchanges: .L (London), .AS (Amsterdam), .DE (Germany/Xetra), .MI (Milan), .PA (Paris), .SW (Swiss)
        self.isin_to_yahoo = {
            # ═══════════════════════════════════════════════════════════════════════════
            # iShares (BlackRock) - Irish Domiciled UCITS
            # ═══════════════════════════════════════════════════════════════════════════
            
            # Core Range - Global Equity
            'IE00B4L5Y983': 'IWDA.AS',      # iShares Core MSCI World UCITS ETF USD (Acc)
            'IE00B4L5YV89': 'IWDA.L',       # iShares Core MSCI World UCITS ETF USD (Acc) - London
            'IE00B0M62Q58': 'IWRD.L',       # iShares MSCI World UCITS ETF USD (Dist)
            'IE00B4L5YX21': 'SWDA.L',       # iShares Core MSCI World UCITS ETF USD (Acc) - Swap
            
            # Core Range - US Equity  
            'IE00B5BMR087': 'CSPX.L',       # iShares Core S&P 500 UCITS ETF USD (Acc)
            'IE00B3F81R35': 'IUSA.L',       # iShares Core S&P 500 UCITS ETF USD (Dist)
            'IE00BKM4GZ66': 'CNDX.L',       # iShares NASDAQ 100 UCITS ETF USD (Acc)
            'IE00B02KXH56': 'IDUS.L',       # iShares S&P 500 UCITS ETF USD (Dist)
            
            # Core Range - Europe
            'IE00B4L5YC18': 'CS51.L',       # iShares Core Euro STOXX 50 UCITS ETF EUR (Acc)
            'IE00B1YZSC51': 'IEAC.L',       # iShares Core EUR Corp Bond UCITS ETF EUR (Dist)
            'IE00B14X4M10': 'IEUR.L',       # iShares Core MSCI Europe UCITS ETF EUR (Dist)
            'IE00B0M63177': 'IMEU.L',       # iShares MSCI Europe UCITS ETF EUR (Acc)
            
            # Core Range - Emerging Markets
            'IE00B52MJY50': 'EIMI.L',       # iShares Core MSCI EM IMI UCITS ETF USD (Acc)
            'IE00B3RBWM25': 'IEMA.L',       # iShares Core MSCI Emerging Markets UCITS ETF USD (Acc)
            'IE00B52MJD48': 'EMIM.L',       # iShares Core MSCI EM IMI UCITS ETF USD (Dist)
            
            # Core Range - Asia Pacific
            'IE00B52SF786': 'IJPA.L',       # iShares Core MSCI Japan IMI UCITS ETF USD (Acc)
            'IE00B4K48X80': 'CPXJ.L',       # iShares Core MSCI Pacific ex Japan UCITS ETF USD (Acc)
            
            # Thematic & Sector
            'IE00BF4RFE31': 'RBOT.L',       # iShares Automation & Robotics UCITS ETF USD (Acc)
            'IE00B53SZB19': 'INRG.L',       # iShares Global Clean Energy UCITS ETF USD (Dist)
            'IE00BYVJRR92': 'DGTL.L',       # iShares Digitalisation UCITS ETF USD (Acc)
            'IE00BKWQ0D84': 'HEAL.L',       # iShares Healthcare Innovation UCITS ETF USD (Acc)
            
            # Fixed Income
            'IE00B4WXJJ64': 'IBTM.L',       # iShares USD Treasury Bond 7-10yr UCITS ETF USD (Dist)
            'IE00B66F4759': 'IBTS.L',       # iShares USD Treasury Bond 1-3yr UCITS ETF USD (Dist)
            'IE00BKX55T58': 'SUAG.L',       # iShares USD Corp Bond UCITS ETF USD (Acc)
            'IE00B0M63516': 'LQDA.L',       # iShares $ Corp Bond UCITS ETF USD (Acc)
            
            # ═══════════════════════════════════════════════════════════════════════════
            # Vanguard - Irish Domiciled UCITS
            # ═══════════════════════════════════════════════════════════════════════════
            'IE00BK5BQT80': 'VWCE.DE',      # Vanguard FTSE All-World UCITS ETF USD (Acc)
            'IE00B3VVMM84': 'VWRL.L',       # Vanguard FTSE All-World UCITS ETF USD (Dist)
            'IE00B3XXRP09': 'VUAA.L',       # Vanguard S&P 500 UCITS ETF USD (Acc)
            'IE00BFMXXD54': 'VUSA.L',       # Vanguard S&P 500 UCITS ETF USD (Dist)
            'IE00BK5BQV03': 'VWRP.L',       # Vanguard FTSE Developed World UCITS ETF USD (Acc)
            'IE00BK5BR733': 'VFEM.L',       # Vanguard FTSE Emerging Markets UCITS ETF USD (Acc)
            'IE00B945VV12': 'VDEV.L',       # Vanguard FTSE Developed World UCITS ETF USD (Dist)
            'IE00BKX55R35': 'VJPN.L',       # Vanguard FTSE Japan UCITS ETF USD (Dist)
            'IE00B95PGT31': 'VEUR.L',       # Vanguard FTSE Developed Europe UCITS ETF EUR (Dist)
            
            # ═══════════════════════════════════════════════════════════════════════════
            # Amundi - Luxembourg & Irish Domiciled UCITS
            # ═══════════════════════════════════════════════════════════════════════════
            'LU1681043599': 'CW8.PA',       # Amundi MSCI World UCITS ETF EUR (Acc)
            'LU1681048804': 'SP5.PA',       # Amundi S&P 500 UCITS ETF EUR (Acc)
            'LU1437016972': 'MWRD.PA',      # Amundi MSCI World UCITS ETF DR EUR (Acc)
            'LU1135865084': 'CEM.PA',       # Amundi MSCI Emerging Markets UCITS ETF EUR (Acc)
            'LU1681038672': 'C50.PA',       # Amundi Euro STOXX 50 UCITS ETF EUR (Acc)
            
            # ═══════════════════════════════════════════════════════════════════════════
            # Invesco - Irish Domiciled UCITS
            # ═══════════════════════════════════════════════════════════════════════════
            'IE00B3YCGJ38': 'EQQQ.L',       # Invesco EQQQ NASDAQ-100 UCITS ETF USD (Acc)
            'IE00BFYN8Y92': 'SPXS.L',       # Invesco S&P 500 UCITS ETF USD (Acc)
            
            # ═══════════════════════════════════════════════════════════════════════════
            # SPDR (State Street) - Irish Domiciled UCITS  
            # ═══════════════════════════════════════════════════════════════════════════
            'IE00B6YX5C33': 'SPY5.L',       # SPDR S&P 500 UCITS ETF USD (Acc)
            'IE00B44Z5B48': 'SPMW.L',       # SPDR MSCI World UCITS ETF USD (Acc)
            
            # ═══════════════════════════════════════════════════════════════════════════
            # Xtrackers (DWS) - Irish Domiciled UCITS
            # ═══════════════════════════════════════════════════════════════════════════
            'IE00BJ0KDQ92': 'XDWD.L',       # Xtrackers MSCI World UCITS ETF 1C USD (Acc)
            'IE00BM67HT60': 'XDWH.L',       # Xtrackers MSCI World UCITS ETF 1D USD (Dist)
        }
        
        # Reverse mapping for lookup
        self.yahoo_to_isin = {v: k for k, v in self.isin_to_yahoo.items()}
    
    def get_yahoo_symbol(self, isin: str) -> Optional[str]:
        """Get Yahoo Finance symbol for an ISIN"""
        return self.isin_to_yahoo.get(isin)
    
    def add_mapping(self, isin: str, yahoo_symbol: str):
        """Add a new ISIN to Yahoo symbol mapping"""
        self.isin_to_yahoo[isin] = yahoo_symbol
        self.yahoo_to_isin[yahoo_symbol] = isin
    
    def get_current_nav(self, isin: str) -> Optional[Dict]:
        """Get current NAV for an ISIN"""
        yahoo_symbol = self.get_yahoo_symbol(isin)
        if not yahoo_symbol:
            return None
        
        try:
            ticker = yf.Ticker(yahoo_symbol)
            info = ticker.info
            
            return {
                'isin': isin,
                'yahoo_symbol': yahoo_symbol,
                'name': info.get('longName') or info.get('shortName', 'Unknown'),
                'nav': info.get('regularMarketPrice') or info.get('previousClose'),
                'currency': info.get('currency', 'USD'),
                'change': info.get('regularMarketChange'),
                'change_percent': info.get('regularMarketChangePercent'),
                'volume': info.get('regularMarketVolume'),
                'market_cap': info.get('totalAssets'),  # For ETFs this is AUM
                'fifty_two_week_high': info.get('fiftyTwoWeekHigh'),
                'fifty_two_week_low': info.get('fiftyTwoWeekLow'),
                'fetched_at': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error fetching current NAV for {isin}: {e}")
            return None
    
    def get_nav_history(self, isin: str, start_date: str = None, end_date: str = None, period: str = '1y') -> List[Dict]:
        """
        Get historical NAV data for an ISIN
        
        Args:
            isin: The ISIN to look up
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            period: Period if no dates provided (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
        """
        yahoo_symbol = self.get_yahoo_symbol(isin)
        if not yahoo_symbol:
            return []
        
        try:
            ticker = yf.Ticker(yahoo_symbol)
            
            if start_date and end_date:
                hist = ticker.history(start=start_date, end=end_date)
            else:
                hist = ticker.history(period=period)
            
            data = []
            for date, row in hist.iterrows():
                data.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'open': round(row['Open'], 4),
                    'high': round(row['High'], 4),
                    'low': round(row['Low'], 4),
                    'close': round(row['Close'], 4),  # This is the NAV
                    'volume': int(row['Volume']),
                    'nav': round(row['Close'], 4)  # Alias for clarity
                })
            
            return data
            
        except Exception as e:
            print(f"Error fetching NAV history for {isin}: {e}")
            return []
    
    def get_multiple_navs(self, isins: List[str]) -> Dict[str, Dict]:
        """Get current NAV for multiple ISINs"""
        results = {}
        for isin in isins:
            nav_data = self.get_current_nav(isin)
            results[isin] = nav_data if nav_data else {'error': 'Not found or mapping missing'}
        return results
    
    def search_etf(self, query: str) -> List[Dict]:
        """Search for ETFs by name (useful for finding Yahoo symbols)"""
        try:
            # Use yfinance search (limited functionality)
            tickers = yf.Tickers(query)
            results = []
            
            # Try common European exchanges
            exchanges = ['.L', '.AS', '.DE', '.PA', '.MI', '.SW']
            for exchange in exchanges:
                try:
                    ticker = yf.Ticker(query + exchange)
                    info = ticker.info
                    if info.get('regularMarketPrice'):
                        results.append({
                            'symbol': query + exchange,
                            'name': info.get('longName') or info.get('shortName'),
                            'exchange': exchange,
                            'price': info.get('regularMarketPrice'),
                            'currency': info.get('currency')
                        })
                except:
                    continue
            
            return results
        except Exception as e:
            print(f"Search error: {e}")
            return []
    
    def get_all_mappings(self) -> Dict[str, str]:
        """Return all ISIN to Yahoo symbol mappings"""
        return self.isin_to_yahoo.copy()


# Quick test function
def test_nav_service():
    """Test the NAV service with a known ETF"""
    service = NAVDataService()
    
    print("=" * 50)
    print("Testing NAV Data Service")
    print("=" * 50)
    
    # Test with iShares Core MSCI World (very popular ETF)
    test_isin = 'IE00B4L5Y983'
    
    print(f"\n1. Getting current NAV for {test_isin}...")
    current = service.get_current_nav(test_isin)
    if current:
        print(f"   [OK] Name: {current.get('name')}")
        print(f"   [OK] NAV: {current.get('currency')} {current.get('nav')}")
        change_pct = current.get('change_percent')
        if change_pct is not None:
            print(f"   [OK] Change: {change_pct:.2f}%")
        else:
            print(f"   [OK] Change: N/A")
        print(f"   [OK] AUM: {current.get('market_cap')}")
    else:
        print("   [FAIL] Failed to fetch current NAV")
    
    print(f"\n2. Getting 30-day history for {test_isin}...")
    history = service.get_nav_history(test_isin, period='1mo')
    if history:
        print(f"   [OK] Got {len(history)} data points")
        print(f"   [OK] Latest: {history[-1]['date']} - NAV: {history[-1]['nav']}")
        print(f"   [OK] Oldest: {history[0]['date']} - NAV: {history[0]['nav']}")
    else:
        print("   [FAIL] Failed to fetch history")
    
    print(f"\n3. Testing multiple ISINs...")
    test_isins = ['IE00B4L5Y983', 'IE00B5BMR087', 'IE00BK5BQT80']
    multi = service.get_multiple_navs(test_isins)
    for isin, data in multi.items():
        if 'error' not in data:
            print(f"   [OK] {isin}: {data.get('currency')} {data.get('nav')}")
        else:
            print(f"   [FAIL] {isin}: {data.get('error')}")
    
    print("\n" + "=" * 50)
    print("Test complete!")
    print("=" * 50)
    
    return service


if __name__ == '__main__':
    test_nav_service()

