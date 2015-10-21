package dotaReplayProcessor;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import skadistats.clarity.model.Entity;
import skadistats.clarity.model.FieldPath;
import skadistats.clarity.processor.entities.Entities;
import skadistats.clarity.processor.entities.OnEntityCreated;
import skadistats.clarity.processor.entities.OnEntityUpdated;
import skadistats.clarity.processor.entities.UsesEntities;
import skadistats.clarity.processor.reader.OnTickStart;
import skadistats.clarity.processor.runner.Context;
import skadistats.clarity.processor.runner.ControllableRunner;
import skadistats.clarity.processor.runner.SimpleRunner;
import skadistats.clarity.source.MappedFileSource;
import javax.vecmath.Vector2d;
import javax.vecmath.Vector2f;
import skadistats.clarity.decoder.Util;

public class ReplayProcessor {
	MappedFileSource file_source;
	OutputGenerator output;
	private static int MAX_COORD_INTEGER = 16384;
	boolean init = false;
    Integer time = 0;
    int numPlayers = 10;
    int[] validIndices = new int[numPlayers];
	
	Map<String, Integer> hero_indices;
	Map<String, Double> data_fields;
	
	public ReplayProcessor(String filename_replay, OutputGenerator output) throws IOException {
		file_source = new MappedFileSource(filename_replay);

		data_fields = new HashMap<String, Double>();
		data_fields.put("time", 0.0);
    	for(int i = 0; i < 10; ++i)
    	{
    		data_fields.put(i+"X", 0.0);
        	data_fields.put(i+"Y", 0.0);
        	data_fields.put(i+"Gold", 0.0);
    		//data_fields.put(i+"Alive", 1.0); //start as dead
    	}
		this.output = output;
		this.output.init(data_fields);
		hero_indices = new HashMap<String, Integer>();
	}

	public void process() throws IOException {
		ControllableRunner runner = new ControllableRunner(file_source);
		runner.runWith(this);
        while(!runner.isAtEnd()) {
            runner.tick();
            output.writeTick(data_fields);
        }
        output.finish();
		//new SimpleRunner(file_source).runWith(this);
	}
	
	@UsesEntities
    @OnTickStart
    public void onTickStart(Context ctx, boolean synthetic) {
        //s1 DT_DOTAGameRulesProxy
        Entity grp = ctx.getProcessor(Entities.class).getByDtName("CDOTAGamerulesProxy");
        Entity pr = ctx.getProcessor(Entities.class).getByDtName("CDOTA_PlayerResource");
        Entity dData = ctx.getProcessor(Entities.class).getByDtName("CDOTA_DataDire");
        Entity rData = ctx.getProcessor(Entities.class).getByDtName("CDOTA_DataRadiant");

        if (grp != null) {
        	float t = getEntityProperty(grp, "m_pGameRules.m_fGameTime", null);
        	Double time = (double) t;
            data_fields.put("time", time);
        }
        if (pr != null) {
            //Radiant coach shows up in vecPlayerTeamData as position 5
            //all the remaining dire entities are offset by 1 and so we miss reading the last one and don't get data for the first dire player
            //coaches appear to be on team 1, radiant is 2 and dire is 3?
            //construct an array of valid indices to get vecPlayerTeamData from
            if (!init) {
                int added = 0;
                int i = 0;
                //according to @Decoud Valve seems to have fixed this issue and players should be in first 10 slots again
                //sanity check of i to prevent infinite loop when <10 players?
                while (added < numPlayers && i < 100) {
                    //check each m_vecPlayerData to ensure the player's team is radiant or dire
                    int playerTeam = getEntityProperty(pr, "m_vecPlayerData.%i.m_iPlayerTeam", i);
                    if (playerTeam == 2 || playerTeam == 3) {
                        //if so, add it to validIndices, add 1 to added
                        validIndices[added] = i;
                        added += 1;
                    }

                    i += 1;
                }
                init = true;
            }

            //System.err.println(pr);
            for (int i = 0; i < numPlayers; i++) {
                //Integer hero = getEntityProperty(pr, "m_vecPlayerTeamData.%i.m_nSelectedHeroID", validIndices[i]);
                int handle = getEntityProperty(pr, "m_vecPlayerTeamData.%i.m_hSelectedHero", validIndices[i]);
                //Long steamid = getEntityProperty(pr, "m_vecPlayerData.%i.m_iPlayerSteamID", validIndices[i]);
                int playerTeam = getEntityProperty(pr, "m_vecPlayerData.%i.m_iPlayerTeam", validIndices[i]);
                int teamSlot = getEntityProperty(pr, "m_vecPlayerTeamData.%i.m_iTeamSlot", validIndices[i]);
                //System.err.format("hero:%s i:%s teamslot:%s playerteam:%s\n", hero, i, teamSlot, playerTeam);
                
                //2 is radiant, 3 is dire, 1 is other?
                Entity dataTeam = playerTeam == 2 ? rData : dData;

                //Entry entry = new Entry(time);
                //entry.type = "interval";
                //entry.slot = i;
                
                int gold = getEntityProperty(dataTeam, "m_vecDataTeam.%i.m_iTotalEarnedGold", teamSlot);
                //entry.lh = getEntityProperty(dataTeam, "m_vecDataTeam.%i.m_iLastHitCount", teamSlot);
                //entry.xp = getEntityProperty(dataTeam, "m_vecDataTeam.%i.m_iTotalEarnedXP", teamSlot);
                //entry.stuns = getEntityProperty(dataTeam, "m_vecDataTeam.%i.m_fStuns", teamSlot);

                //TODO: gem, rapier time?
                //https://github.com/yasp-dota/yasp/issues/333
                //need to dump inventory items for each player and possibly keep track of item entity handles

                //time dead, count number of intervals where this value is >0?
                //m_iRespawnSeconds.0000

                //get the player's hero entity
                Entity e = ctx.getProcessor(Entities.class).getByHandle(handle);
                //get the hero's coordinates
                if (e != null) {
                    //System.err.println(e);
                    
            		int cell_x = getEntityProperty(e, "CBodyComponent.m_cellX", null);
            		int cell_y = getEntityProperty(e, "CBodyComponent.m_cellY", null);
            	    float offsetx = 0;//getEntityProperty(e, "CBodyComponent.m_vecOrigin.x", null);
            	    float offsety = 0;//getEntityProperty(e, "CBodyComponent.m_vecOrigin.y", null);
            	    int cellbits = 7;//getEntityProperty(e, "CBodyComponent.m_cellbits", null);
            	    
            	    int cellwidth = 1 << cellbits;
            	    Vector2f pos = new Vector2f();
            	    pos.x = (float)(((cell_x * cellwidth) - MAX_COORD_INTEGER) + (double)offsetx);
            	    pos.y = (float) (((cell_y * cellwidth) - MAX_COORD_INTEGER) + (double)offsety);
            	    
                    //int alive = getEntityProperty(e, "m_iLifeState", null);
                    //System.err.format("%s, %s\n", entry.x, entry.y);
                    //get the hero's entity name, ex: CDOTA_Hero_Zuus
                    //entry.unit = e.getDtClass().getDtName();
                    //entry.hero_id = hero;
                    
                    data_fields.put(i+"X", (double)pos.x);
                    data_fields.put(i+"Y", (double)pos.y);
                    data_fields.put(i+"Gold", (double)gold);
                    //data_fields.put(i+"Alive", (double)alive);
                }
                //es.output(entry);

            }
            output.writeTick(data_fields);
        }
    }

    public <T> T getEntityProperty(Entity e, String property, Integer idx) {
        if (e == null) {
            return null;
        }
        if (idx != null) {
            property = property.replace("%i", Util.arrayIdxToString(idx));
        }
        FieldPath fp = e.getDtClass().getFieldPathForName(property);
        return e.getPropertyForFieldPath(fp);
    }
	
}
