package dotaReplayProcessor;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

public class OutputGenerator {
	BufferedWriter writer;
	BufferedWriter header_writer;
	BufferedWriter event_writer;
	BufferedWriter ents_writer;
	List<String> key_order;
	public OutputGenerator(String directory_out) {
		try {
		File file = new File(directory_out+"trajectories.csv");
		File file_events = new File(directory_out+"events.csv");
		File file_header = new File(directory_out+"header.csv");
		File file_ents = new File(directory_out+"ents.csv");
		FileWriter fw;
		FileWriter fw_events;
		FileWriter fw_header;
		FileWriter fw_ents;
	
		fw = new FileWriter(file);
		fw_events = new FileWriter(file_events);
		fw_header = new FileWriter(file_header);
		fw_ents = new FileWriter(file_ents);

		 writer = new BufferedWriter(fw);
		 event_writer = new BufferedWriter(fw_events);
		 header_writer = new BufferedWriter(fw_header);
		 ents_writer = new BufferedWriter(fw_ents);
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	public static long getUnsignedInt(int x) {
	    return x & 0x00000000ffffffffL;
	}
	
	public void writeGameData(int game_id, String radiant_team, String dire_team, String winner, long end_time){

		try {
			header_writer.write("ID, "+getUnsignedInt(game_id)+"\n");
			header_writer.write("TEAM_TAG_RADIANT, "+radiant_team.replace(",", "")+"\n");
			header_writer.write("TEAM_TAG_DIRE, "+dire_team.replace(",", "")+"\n");
			header_writer.write("WINNER, "+winner+"\n");
			//header_writer.write("END_TIME, "+new SimpleDateFormat("MM/dd/yyyy HH:mm:ss").format(end_time)+"\n");
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	
	public void init(Map<String, Double> data_fields) {
		key_order = new LinkedList<String>();
		
	    Iterator it = data_fields.entrySet().iterator();
		while (it.hasNext()) {
	        Map.Entry pair = (Map.Entry)it.next();
	       key_order.add((String) pair.getKey());
	    }
		Collections.sort(key_order);
        try {
			Iterator it_keys = key_order.iterator();
			while (it_keys.hasNext()) {
		        String key = (String) it_keys.next();
				writer.write(key);
				
		        if(it_keys.hasNext())
		        {
		        	writer.write(",");
		        }
		    }
			writer.write("\n");
        } catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	public void writeTick(Map<String, Double> data_fields) {
		try {
			
			Iterator it_keys = key_order.iterator();
			while (it_keys.hasNext()) {
		        String key = (String) it_keys.next();
				writer.write(""+data_fields.get(key));
				
		        if(it_keys.hasNext())
		        {
		        	writer.write(",");
		        }
		    }
			writer.write("\n");
        } catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	
	public void writeEvent(double time, String event)
	{
		try {
			event_writer.write(time+","+event+"\n");
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	public void finish()
	{
		try {
			writer.flush();
			writer.close();
			event_writer.flush();
			event_writer.close();
			header_writer.flush();
			header_writer.close();
			ents_writer.flush();
			ents_writer.close();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

	}

	public void writePlayerInfo(int i, String playerName, long steamid, String heroName, int gameTeam) {
		try {
			header_writer.write("PLAYER,"+i+","
								+playerName.replace(",", "")+","
								+steamid+","
								+heroName+","
								+gameTeam+"\n");
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	public void writeEntityEvent(double time, String type, String data) {
		try {
			ents_writer.write(time+","+type+","+data+"\n");
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
}
